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

const start = async () => {
  try {
    await connectDB();
    await ensureUserUniqueIndexes();
    await ensureDefaultAdmin();
    await primeAppSettings();
    startBackupScheduler();
    app.listen(env.port, env.host, () => {
      console.log(`TriCore Events API listening on ${env.host}:${env.port}`);
    });
  } catch (error) {
    console.error('Unable to start server', error);
    process.exit(1);
  }
};

start();
