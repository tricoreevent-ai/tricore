import { useEffect, useState } from 'react';

import TypeaheadSelect from '../common/TypeaheadSelect.jsx';
import FormAlert from '../common/FormAlert.jsx';
import { formatDateTime, formatFileSize, formatNumber } from '../../utils/formatters.js';

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
  databaseInfo,
  error,
  infoPending,
  message,
  onDownloadNow,
  onGetDatabaseInfo,
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
            <button
              className="btn-secondary"
              disabled={infoPending}
              onClick={onGetDatabaseInfo}
              type="button"
            >
              {infoPending ? 'Checking...' : 'Get Database Info'}
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

      <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-950">MongoDB Database Info</h3>
            <p className="mt-2 text-sm text-slate-500">
              Check the current database footprint and connection details for the live MongoDB
              database used by backups.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {databaseInfo?.capturedAt
              ? `Updated ${formatDateTime(databaseInfo.capturedAt)}`
              : 'Live on demand'}
          </span>
        </div>

        {databaseInfo ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                  Total Footprint
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-950">
                  {formatFileSize(databaseInfo.stats?.totalFootprint)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Storage: {formatFileSize(databaseInfo.stats?.storageSize)} and indexes:{' '}
                  {formatFileSize(databaseInfo.stats?.indexSize)}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                  Documents
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-950">
                  {formatNumber(databaseInfo.stats?.documents)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Average size: {formatFileSize(databaseInfo.stats?.avgDocumentSize)}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                  Collections
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-950">
                  {formatNumber(databaseInfo.stats?.collections)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Indexes: {formatNumber(databaseInfo.stats?.indexes)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-950">Database:</span>{' '}
                  {databaseInfo.database?.name || 'Unknown'}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-slate-950">Host:</span>{' '}
                  {databaseInfo.database?.host || 'Unknown'}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-slate-950">Mode:</span>{' '}
                  {databaseInfo.database?.mode || 'Unknown'}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-slate-950">Data size:</span>{' '}
                  {formatFileSize(databaseInfo.stats?.dataSize)}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-950">Storage size:</span>{' '}
                  {formatFileSize(databaseInfo.stats?.storageSize)}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-slate-950">Index size:</span>{' '}
                  {formatFileSize(databaseInfo.stats?.indexSize)}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-slate-950">Views:</span>{' '}
                  {formatNumber(databaseInfo.stats?.views)}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-slate-950">Filesystem used:</span>{' '}
                  {databaseInfo.stats?.fsUsedSize !== null &&
                  databaseInfo.stats?.fsUsedSize !== undefined
                    ? formatFileSize(databaseInfo.stats.fsUsedSize)
                    : 'Not reported'}
                </p>
              </div>
            </div>

            {databaseInfo.collections?.length ? (
              <div className="mt-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Available Collections
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {databaseInfo.collections.slice(0, 12).map((collection) => (
                    <span
                      className="rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-600"
                      key={collection.name}
                    >
                      {collection.name}
                    </span>
                  ))}
                  {databaseInfo.collections.length > 12 ? (
                    <span className="rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-500">
                      +{databaseInfo.collections.length - 12} more
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-5 rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">
            No live database information loaded yet. Use the button above to fetch the current
            MongoDB size and details.
          </p>
        )}
      </div>

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
