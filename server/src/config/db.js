import mongoose from 'mongoose';

import { env } from './env.js';

let memoryServer;
let cleanupRegistered = false;
let listenersRegistered = false;
let reconnectPromise = null;
let activeConnectionMode = 'disconnected';
let dbStatus = {
  mode: 'disconnected',
  host: '',
  dbName: '',
  usingMemoryFallback: false,
  configuredUri: '',
  readyState: 0,
  lastError: ''
};

const getConnectionOptions = () => ({
  serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs
});

const sanitizeMongoUri = (uri) => {
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
  } catch {
    return uri;
  }
};

dbStatus = {
  ...dbStatus,
  configuredUri: sanitizeMongoUri(env.mongoUri)
};

const updateDbStatus = (overrides = {}) => {
  dbStatus = {
    ...dbStatus,
    host: mongoose.connection.host || dbStatus.host || '',
    dbName: mongoose.connection.name || dbStatus.dbName || '',
    readyState: mongoose.connection.readyState,
    ...overrides
  };
};

const registerConnectionListeners = () => {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    updateDbStatus({
      mode: activeConnectionMode,
      usingMemoryFallback: activeConnectionMode === 'memory-fallback',
      lastError: ''
    });
  });

  mongoose.connection.on('error', (error) => {
    updateDbStatus({
      mode: mongoose.connection.readyState === 1 ? activeConnectionMode : 'error',
      usingMemoryFallback: activeConnectionMode === 'memory-fallback',
      lastError: error.message || dbStatus.lastError
    });
  });

  mongoose.connection.on('disconnected', () => {
    updateDbStatus({
      mode: 'disconnected',
      host: '',
      usingMemoryFallback: false
    });
  });
};

const registerMemoryCleanup = () => {
  if (cleanupRegistered) {
    return;
  }

  cleanupRegistered = true;

  const stopMemoryServer = async () => {
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
  };

  process.on('SIGINT', async () => {
    await stopMemoryServer();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await stopMemoryServer();
    process.exit(0);
  });
};

const connectToPrimaryMongo = async () => {
  activeConnectionMode = 'primary';
  await mongoose.connect(env.mongoUri, getConnectionOptions());
  updateDbStatus({
    mode: 'primary',
    host: mongoose.connection.host || '',
    dbName: mongoose.connection.name || '',
    usingMemoryFallback: false,
    configuredUri: sanitizeMongoUri(env.mongoUri),
    lastError: ''
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

const connectToMemoryMongo = async (connectionError) => {
  const { MongoMemoryServer } = await import('mongodb-memory-server');

  activeConnectionMode = 'memory-fallback';
  console.warn(
    `Primary MongoDB connection failed (${sanitizeMongoUri(env.mongoUri)}). ` +
      'Starting temporary in-memory MongoDB fallback for development.'
  );
  console.warn(`Original MongoDB error: ${connectionError.message}`);

  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'tricore-events'
    }
  });

  registerMemoryCleanup();
  await mongoose.connect(memoryServer.getUri(), getConnectionOptions());
  updateDbStatus({
    mode: 'memory-fallback',
    host: 'in-memory',
    dbName: mongoose.connection.name || 'tricore-events',
    usingMemoryFallback: true,
    configuredUri: sanitizeMongoUri(env.mongoUri),
    lastError: connectionError.message
  });
  console.log('MongoDB connected: in-memory fallback');
};

export const getDbStatus = () => ({
  ...dbStatus
});

export const isMongoConnectivityError = (error) => {
  const message = String(error?.message || '');

  return (
    [
      'MongooseServerSelectionError',
      'MongoServerSelectionError',
      'MongoNetworkError',
      'MongoNetworkTimeoutError',
      'MongoTopologyClosedError'
    ].includes(error?.name) ||
    /Could not connect to any servers/i.test(message) ||
    /SSL routines/i.test(message) ||
    /tlsv1 alert/i.test(message) ||
    /topology was destroyed/i.test(message) ||
    /connection .* closed/i.test(message)
  );
};

export const getMongoAvailabilityMessage = () =>
  env.nodeEnv === 'production'
    ? 'The database connection is temporarily unavailable. Try again shortly and check server connectivity.'
    : 'The database connection is temporarily unavailable. Check MongoDB Atlas network access or enable development memory fallback.';

export const recoverDbConnection = async ({ forceReconnect = false } = {}) => {
  registerConnectionListeners();

  if (reconnectPromise) {
    return reconnectPromise;
  }

  reconnectPromise = (async () => {
    if (forceReconnect && mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch {
        // Ignore disconnect cleanup errors before retrying the connection.
      }
    }

    if (!forceReconnect && mongoose.connection.readyState === 1) {
      updateDbStatus({
        mode: activeConnectionMode,
        usingMemoryFallback: activeConnectionMode === 'memory-fallback'
      });
      return getDbStatus();
    }

    try {
      await connectToPrimaryMongo();
      return getDbStatus();
    } catch (error) {
      updateDbStatus({
        mode: 'error',
        host: '',
        usingMemoryFallback: false,
        configuredUri: sanitizeMongoUri(env.mongoUri),
        lastError: error.message,
        readyState: mongoose.connection.readyState
      });

      const shouldUseMemoryFallback =
        env.mongoAllowMemoryFallback && env.nodeEnv !== 'production';

      if (!shouldUseMemoryFallback) {
        console.error(
          'MongoDB primary connection failed and memory fallback was skipped. ' +
            'Fix the configured MongoDB connection to access persisted data.'
        );
        throw error;
      }

      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      await connectToMemoryMongo(error);
      return getDbStatus();
    }
  })();

  try {
    return await reconnectPromise;
  } finally {
    reconnectPromise = null;
  }
};

export const connectDB = async () => {
  // Fail queries fast when the DB is unavailable instead of buffering them indefinitely.
  mongoose.set('bufferCommands', false);
  mongoose.set('strictQuery', true);
  registerConnectionListeners();
  await recoverDbConnection({ forceReconnect: mongoose.connection.readyState !== 0 });
};
