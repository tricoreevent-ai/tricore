import { EJSON } from 'bson';
import mongoose from 'mongoose';

import { getDbStatus } from '../config/db.js';
import {
  getBackupSettingsForAutomation,
  recordBackupDeliveryResult,
  recordBackupRestoreResult
} from './backupSettingsService.js';
import { sendEmail } from './emailService.js';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const formatBackupTimestamp = (date) =>
  [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
    '-',
    String(date.getUTCHours()).padStart(2, '0'),
    String(date.getUTCMinutes()).padStart(2, '0'),
    String(date.getUTCSeconds()).padStart(2, '0')
  ].join('');

const serializeMongoSafe = (value) => EJSON.serialize(value);

const parseBackupContent = (content) => {
  const normalized = String(content || '').trim();

  if (!normalized) {
    throw new Error('Backup file is empty.');
  }

  return EJSON.parse(normalized);
};

const sanitizeRestoreCollectionOptions = (options = {}) => {
  const normalized = { ...options };

  delete normalized.uuid;
  delete normalized.idIndex;

  return normalized;
};

const buildIndexOptions = (index = {}) => {
  const options = {};
  const allowedFields = [
    'background',
    'unique',
    'partialFilterExpression',
    'sparse',
    'expireAfterSeconds',
    'storageEngine',
    'weights',
    'default_language',
    'language_override',
    'textIndexVersion',
    '2dsphereIndexVersion',
    'bits',
    'min',
    'max',
    'bucketSize',
    'wildcardProjection',
    'hidden',
    'collation'
  ];

  for (const field of allowedFields) {
    if (index[field] !== undefined) {
      options[field] = index[field];
    }
  }

  return options;
};

const createCollectionWithFallback = async (database, name, options = {}) => {
  const normalizedOptions = sanitizeRestoreCollectionOptions(options);

  try {
    await database.createCollection(name, normalizedOptions);
  } catch (error) {
    if (!Object.keys(normalizedOptions).length) {
      throw error;
    }

    // Some MongoDB-generated options cannot be reused during collection creation on restore.
    await database.createCollection(name);
  }
};

const ensurePersistentMongoConnection = () => {
  const dbStatus = getDbStatus();

  if (dbStatus.usingMemoryFallback) {
    throw new Error(
      'Backups are disabled while the application is using the temporary in-memory database. Connect to the persisted MongoDB instance first.'
    );
  }

  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB is not connected. Backup generation requires an active database connection.');
  }

  return dbStatus;
};

export const buildApplicationBackup = async () => {
  const dbStatus = ensurePersistentMongoConnection();
  const database = mongoose.connection.db;
  const exportedAt = new Date();
  const collectionInfo = await database.listCollections().toArray();
  const collections = [];

  for (const info of [...collectionInfo].sort((left, right) => left.name.localeCompare(right.name))) {
    const collection = database.collection(info.name);
    const [documents, indexes] = await Promise.all([
      collection.find({}).toArray(),
      collection.indexes()
    ]);

    collections.push({
      name: info.name,
      type: info.type || 'collection',
      options: serializeMongoSafe(info.options || {}),
      documentCount: documents.length,
      indexes: serializeMongoSafe(indexes),
      documents: serializeMongoSafe(documents)
    });
  }

  const backupPayload = {
    formatVersion: 2,
    exportedAt: exportedAt.toISOString(),
    database: {
      name: database.databaseName,
      host: dbStatus.host,
      mode: dbStatus.mode,
      configuredUri: dbStatus.configuredUri
    },
    collectionCount: collections.length,
    collections
  };

  return {
    fileName: `tricore-backup-${formatBackupTimestamp(exportedAt)}.json`,
    content: EJSON.stringify(backupPayload, null, 2),
    collectionCount: collections.length
  };
};

export const restoreApplicationBackup = async ({
  content,
  fileName = '',
  triggeredBy = 'manual',
  userId = null
}) => {
  const attemptedAt = new Date().toISOString();

  try {
    ensurePersistentMongoConnection();
    const database = mongoose.connection.db;
    const backupPayload = parseBackupContent(content);
    const collections = Array.isArray(backupPayload?.collections) ? backupPayload.collections : null;

    if (!collections) {
      throw new Error('Backup file is invalid. Expected a collections array.');
    }

    const restorableCollections = collections.filter(
      (collection) => collection?.name && !String(collection.name).startsWith('system.')
    );
    const existingCollectionInfo = await database.listCollections().toArray();
    const existingCollectionNames = existingCollectionInfo
      .map((collection) => collection.name)
      .filter((name) => !String(name).startsWith('system.'));
    const backupCollectionNames = new Set(restorableCollections.map((collection) => collection.name));

    // Restore reproduces the backup state, so collections absent from the backup are removed first.
    for (const collectionName of existingCollectionNames) {
      if (!backupCollectionNames.has(collectionName)) {
        await database.collection(collectionName).drop();
      }
    }

    for (const collectionData of restorableCollections) {
      const collectionName = collectionData.name;

      if (existingCollectionNames.includes(collectionName)) {
        await database.collection(collectionName).drop();
      }

      await createCollectionWithFallback(
        database,
        collectionName,
        collectionData.options && typeof collectionData.options === 'object'
          ? collectionData.options
          : {}
      );

      const documents = Array.isArray(collectionData.documents) ? collectionData.documents : [];

      if (documents.length) {
        await database.collection(collectionName).insertMany(documents, { ordered: true });
      }

      const indexes = Array.isArray(collectionData.indexes) ? collectionData.indexes : [];

      for (const index of indexes) {
        if (!index?.key || index.name === '_id_') {
          continue;
        }

        await database.collection(collectionName).createIndex(index.key, buildIndexOptions(index));
      }
    }

    await recordBackupRestoreResult({
      attemptedAt,
      restoredAt: new Date().toISOString(),
      status: 'restored',
      error: '',
      fileName: String(fileName || '').trim(),
      triggeredBy,
      userId
    });

    return {
      collectionCount: restorableCollections.length,
      fileName: String(fileName || '').trim()
    };
  } catch (error) {
    await recordBackupRestoreResult({
      attemptedAt,
      restoredAt: '',
      status: 'failed',
      error: error.message,
      fileName: String(fileName || '').trim(),
      triggeredBy,
      userId
    });

    throw error;
  }
};

export const emailApplicationBackup = async ({
  email,
  triggeredBy = 'manual',
  userId = null
}) => {
  const settings = await getBackupSettingsForAutomation();
  const to = normalizeEmail(email || settings.backupEmail);

  if (!to) {
    throw new Error('Backup email is required before a backup can be sent.');
  }

  const attemptedAt = new Date().toISOString();

  try {
    const backup = await buildApplicationBackup();

    await sendEmail({
      to,
      subject: `TriCore Events Backup - ${backup.fileName}`,
      text: [
        'TriCore Events database backup attached.',
        '',
        `File: ${backup.fileName}`,
        `Collections exported: ${backup.collectionCount}`,
        '',
        'This backup includes MongoDB documents and index definitions for the connected database.'
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2 style="margin-bottom: 16px;">TriCore Events Database Backup</h2>
          <p style="margin: 0 0 12px;">A database backup is attached to this email.</p>
          <p style="margin: 0 0 8px;"><strong>File:</strong> ${backup.fileName}</p>
          <p style="margin: 0 0 8px;"><strong>Collections exported:</strong> ${backup.collectionCount}</p>
          <p style="margin: 0;">This backup includes MongoDB documents and index definitions for the connected database.</p>
        </div>
      `,
      attachments: [
        {
          filename: backup.fileName,
          content: backup.content,
          contentType: 'application/json'
        }
      ]
    });

    await recordBackupDeliveryResult({
      attemptedAt,
      downloadedAt: '',
      sentAt: new Date().toISOString(),
      status: 'sent',
      error: '',
      fileName: backup.fileName,
      triggeredBy,
      userId
    });

    return {
      email: to,
      fileName: backup.fileName,
      collectionCount: backup.collectionCount
    };
  } catch (error) {
    await recordBackupDeliveryResult({
      attemptedAt,
      downloadedAt: '',
      sentAt: '',
      status: 'failed',
      error: error.message,
      fileName: '',
      triggeredBy,
      userId
    });

    throw error;
  }
};
