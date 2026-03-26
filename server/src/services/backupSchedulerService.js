import { emailApplicationBackup } from './backupService.js';
import { getBackupSettingsForAutomation } from './backupSettingsService.js';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

const frequencyToMs = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
};

let schedulerStarted = false;
let schedulerTimer = null;
let schedulerBusy = false;

const isBackupDue = (settings) => {
  if (!settings?.backupEmail || !settings?.scheduleFrequency || settings.scheduleFrequency === 'disabled') {
    return false;
  }

  const waitMs = frequencyToMs[settings.scheduleFrequency];

  if (!waitMs) {
    return false;
  }

  if (!settings.lastBackupAttemptAt) {
    return true;
  }

  const previousAttempt = new Date(settings.lastBackupAttemptAt);

  if (Number.isNaN(previousAttempt.getTime())) {
    return true;
  }

  return Date.now() - previousAttempt.getTime() >= waitMs;
};

export const checkScheduledBackup = async () => {
  if (schedulerBusy) {
    return;
  }

  schedulerBusy = true;

  try {
    const settings = await getBackupSettingsForAutomation();

    if (!isBackupDue(settings)) {
      return;
    }

    await emailApplicationBackup({
      email: settings.backupEmail,
      triggeredBy: 'schedule'
    });
  } catch (error) {
    console.warn('Scheduled backup warning:', error.message);
  } finally {
    schedulerBusy = false;
  }
};

export const startBackupScheduler = () => {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;
  schedulerTimer = setInterval(() => {
    void checkScheduledBackup();
  }, CHECK_INTERVAL_MS);

  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }

  void checkScheduledBackup();
};
