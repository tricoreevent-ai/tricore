import { useEffect, useState } from 'react';

import TypeaheadSelect from '../common/TypeaheadSelect.jsx';
import FormAlert from '../common/FormAlert.jsx';
import { formatDateTime } from '../../utils/formatters.js';

const frequencyOptions = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

const sanitizeForm = (config) => ({
  backupEmail: String(config?.backupEmail || '').trim(),
  scheduleFrequency: String(config?.scheduleFrequency || 'disabled').trim() || 'disabled'
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const statusTone = {
  sent: 'bg-emerald-50 text-emerald-700',
  downloaded: 'bg-sky-50 text-sky-700',
  restored: 'bg-violet-50 text-violet-700',
  failed: 'bg-red-50 text-red-600',
  idle: 'bg-slate-100 text-slate-600'
};

export default function BackupSettingsPanel({
  config,
  error,
  message,
  onDownloadNow,
  onRefresh,
  onRestoreNow,
  onSave,
  onSendNow,
  downloadPending,
  restorePending,
  savePending,
  sendPending
}) {
  const [form, setForm] = useState(sanitizeForm(config));
  const [localError, setLocalError] = useState('');
  const [restoreFile, setRestoreFile] = useState(null);

  useEffect(() => {
    setForm(sanitizeForm(config));
    setLocalError('');
  }, [config]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
    setLocalError('');
  };

  const validateEmail = (email) => {
    if (!email) {
      return 'Backup email is required.';
    }

    if (!emailPattern.test(email)) {
      return 'Enter a valid backup email address.';
    }

    return '';
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (form.scheduleFrequency !== 'disabled') {
      const nextError = validateEmail(form.backupEmail);

      if (nextError) {
        setLocalError(nextError);
        return;
      }
    }

    await onSave({
      backupEmail: form.backupEmail,
      scheduleFrequency: form.scheduleFrequency
    });
  };

  const handleSendNow = async () => {
    const nextError = validateEmail(form.backupEmail);

    if (nextError) {
      setLocalError(nextError);
      return;
    }

    await onSendNow(form.backupEmail);
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      setLocalError('Choose a backup file before starting restore.');
      return;
    }

    const confirmed = window.confirm(
      'Restoring a backup will replace the current database contents. Continue?'
    );

    if (!confirmed) {
      return;
    }

    const content = await restoreFile.text();
    await onRestoreNow({
      content,
      fileName: restoreFile.name
    });
  };

  return (
    <section className="panel mt-8 space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Database Backup and Restore</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Download a full MongoDB dump, email scheduled backups, or restore the database from a
            previously saved backup file.
          </p>
        </div>
        <button className="btn-secondary" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Backup Status</p>
          <div className="mt-3">
            <span className={`badge ${statusTone[config?.lastBackupStatus] || statusTone.idle}`}>
              {config?.lastBackupStatus || 'idle'}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {config?.lastBackupAttemptAt ? formatDateTime(config.lastBackupAttemptAt) : 'No backup attempt yet.'}
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Last Download</p>
          <p className="mt-3 text-sm text-slate-600">
            {config?.lastBackupDownloadedAt
              ? formatDateTime(config.lastBackupDownloadedAt)
              : 'No backup downloaded yet.'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {config?.lastBackupFileName || 'Downloaded filename will appear here.'}
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Last Email Send</p>
          <p className="mt-3 text-sm text-slate-600">
            {config?.lastBackupSentAt ? formatDateTime(config.lastBackupSentAt) : 'No successful backup email yet.'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Recipient: {config?.backupEmail || 'Not configured'}
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Last Restore</p>
          <div className="mt-3">
            <span className={`badge ${statusTone[config?.lastRestoreStatus] || statusTone.idle}`}>
              {config?.lastRestoreStatus || 'idle'}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {config?.lastRestoreCompletedAt
              ? formatDateTime(config.lastRestoreCompletedAt)
              : 'No restore completed yet.'}
          </p>
        </div>
      </div>

      <FormAlert message={error || localError} />
      <FormAlert message={message} type="success" />

      <form className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]" onSubmit={handleSave}>
        <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-xl font-bold text-slate-950">Backup Delivery</h3>

          <div>
            <label className="label" htmlFor="backupEmail">
              Backup Email
            </label>
            <input
              className="input"
              id="backupEmail"
              onChange={(event) => updateField('backupEmail', event.target.value)}
              placeholder="backup@yourdomain.com"
              type="email"
              value={form.backupEmail}
            />
          </div>

          <div>
            <label className="label" htmlFor="scheduleFrequency">
              Automatic Schedule
            </label>
            <TypeaheadSelect
              id="scheduleFrequency"
              onChange={(event) => updateField('scheduleFrequency', event.target.value)}
              options={frequencyOptions}
              placeholder="Choose schedule"
              searchPlaceholder="Search schedules"
              value={form.scheduleFrequency}
            />
          </div>

          <p className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-600">
            Automatic backups use the configured SMTP settings. Manual download produces a full JSON
            dump that can later be restored from this page.
          </p>

          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" disabled={savePending} type="submit">
              {savePending ? 'Saving...' : 'Save Backup Settings'}
            </button>
            <button
              className="btn-secondary"
              disabled={sendPending}
              onClick={handleSendNow}
              type="button"
            >
              {sendPending ? 'Sending...' : 'Send Backup Now'}
            </button>
            <button
              className="btn-secondary"
              disabled={downloadPending}
              onClick={onDownloadNow}
              type="button"
            >
              {downloadPending ? 'Preparing...' : 'Download Backup'}
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-xl font-bold text-slate-950">Restore Database</h3>
          <p className="text-sm text-slate-500">
            Upload a previously downloaded backup file to restore the entire application database to
            that saved state.
          </p>

          <div>
            <label className="label" htmlFor="restoreBackupFile">
              Backup File
            </label>
            <input
              accept=".json,application/json"
              className="input"
              id="restoreBackupFile"
              onChange={(event) => setRestoreFile(event.target.files?.[0] || null)}
              type="file"
            />
            <p className="mt-2 text-xs text-slate-500">
              {restoreFile ? `Selected: ${restoreFile.name}` : 'Choose a backup JSON file.'}
            </p>
          </div>

          <p className="rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-700">
            Restore is destructive. Collections not present in the backup will be removed.
          </p>

          <button
            className="btn-primary"
            disabled={restorePending}
            onClick={() => {
              void handleRestore();
            }}
            type="button"
          >
            {restorePending ? 'Restoring...' : 'Restore Backup'}
          </button>
        </div>
      </form>

      {config?.lastBackupError ? (
        <p className="rounded-2xl bg-red-50 px-4 py-4 text-sm text-red-600">
          Last backup error: {config.lastBackupError}
        </p>
      ) : null}

      {config?.lastRestoreError ? (
        <p className="rounded-2xl bg-red-50 px-4 py-4 text-sm text-red-600">
          Last restore error: {config.lastRestoreError}
        </p>
      ) : null}
    </section>
  );
}
