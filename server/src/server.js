import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { ensureDefaultAdmin, ensureUserUniqueIndexes } from './services/authService.js';
import { ensureBackupSettingDocument } from './services/backupSettingsService.js';
import { startBackupScheduler } from './services/backupSchedulerService.js';
import { ensureContactForwardingSettingDocument } from './services/contactSettingsService.js';
import { ensureEmailSettingDocument } from './services/emailSettingsService.js';
import { ensureInvoiceSettingDocument } from './services/invoiceSettingsService.js';
import { initializeFileLogging } from './utils/fileLogger.js';

initializeFileLogging();

const DB_RETRY_DELAY_MS = 30000;
let persistenceBootstrapCompleted = false;
let dbRetryTimer = null;

const primeAppSettings = async () => {
  try {
    await Promise.all([
      ensureBackupSettingDocument(),
      ensureEmailSettingDocument(),
      ensureContactForwardingSettingDocument(),
      ensureInvoiceSettingDocument()
    ]);
  } catch (error) {
    console.warn('Settings bootstrap warning:', error.message);
  }
};

const scheduleDbReconnect = () => {
  if (dbRetryTimer) {
    return;
  }

  console.warn(`Retrying database bootstrap in ${DB_RETRY_DELAY_MS / 1000} seconds.`);
  dbRetryTimer = setTimeout(() => {
    dbRetryTimer = null;
    void connectAndBootstrapPersistence();
  }, DB_RETRY_DELAY_MS);

  if (typeof dbRetryTimer.unref === 'function') {
    dbRetryTimer.unref();
  }
};

const bootstrapPersistenceServices = async () => {
  if (persistenceBootstrapCompleted) {
    return;
  }

  await ensureUserUniqueIndexes();
  await ensureDefaultAdmin();
  await primeAppSettings();
  startBackupScheduler();
  persistenceBootstrapCompleted = true;
};

const connectAndBootstrapPersistence = async () => {
  try {
    await connectDB();
    await bootstrapPersistenceServices();
  } catch (error) {
    console.error('Database bootstrap warning:', error);
    scheduleDbReconnect();
  }
};

const start = () => {
  app.listen(env.port, env.host, () => {
    console.log(`TriCore Events API listening on ${env.host}:${env.port}`);
    void connectAndBootstrapPersistence();
  });
};

start();
