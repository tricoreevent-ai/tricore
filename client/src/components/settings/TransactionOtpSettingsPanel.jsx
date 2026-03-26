import { useEffect, useState } from 'react';

import FormAlert from '../common/FormAlert.jsx';
import { formatDateTime } from '../../utils/formatters.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeForm = (config) => ({
  enabled: Boolean(config?.enabled),
  deliveryEmail: String(config?.deliveryEmail || '').trim()
});

export default function TransactionOtpSettingsPanel({
  config,
  error,
  message,
  onRefresh,
  onSave,
  savePending
}) {
  const [form, setForm] = useState(sanitizeForm(config));
  const [localError, setLocalError] = useState('');

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

  const handleSave = async (event) => {
    event.preventDefault();

    if (form.deliveryEmail && !emailPattern.test(form.deliveryEmail)) {
      setLocalError('Enter a valid OTP recipient email address or leave it blank to use the primary super admin email.');
      return;
    }

    await onSave({
      enabled: Boolean(form.enabled),
      deliveryEmail: form.deliveryEmail.trim()
    });
  };

  return (
    <section className="panel mt-8 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transaction OTP Approval</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Control whether manual transaction edits and deletes require an OTP. When no custom recipient is set, the first full-access admin email is used automatically.
          </p>
        </div>
        <button className="btn-secondary" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Status</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{config?.enabled ? 'Enabled' : 'Disabled'}</p>
          <p className="mt-2 text-sm text-slate-500">
            {config?.enabled
              ? 'Transaction edit and delete approval currently requires OTP.'
              : 'Full-access admins can edit or delete manual transactions without OTP.'}
          </p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Recipient</p>
          <p className="mt-3 break-all text-lg font-bold text-slate-950">
            {config?.effectiveRecipientEmail || 'Not configured'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {config?.deliveryEmail
              ? 'Using the custom OTP recipient email saved below.'
              : config?.fallbackRecipientEmail
                ? 'Using the primary full-access admin email as the fallback recipient.'
                : 'Save a custom recipient email or add an email to a full-access admin account.'}
          </p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Last Updated</p>
          <p className="mt-3 text-sm font-medium text-slate-700">
            {config?.updatedAt ? formatDateTime(config.updatedAt) : 'No saved update yet.'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {config?.updatedBy?.name || config?.updatedBy?.username || 'System defaults'}
          </p>
        </div>
      </div>

      <FormAlert message={error || localError} />
      <FormAlert message={message} type="success" />

      <form className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]" onSubmit={handleSave}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
            <input
              checked={form.enabled}
              onChange={(event) => updateField('enabled', event.target.checked)}
              type="checkbox"
            />
            Require OTP before editing or deleting manual transactions
          </label>

          <div className="md:col-span-2">
            <label className="label" htmlFor="transactionOtpRecipient">
              Custom OTP Recipient Email
            </label>
            <input
              className="input"
              id="transactionOtpRecipient"
              onChange={(event) => updateField('deliveryEmail', event.target.value)}
              placeholder={config?.fallbackRecipientEmail || 'superadmin@tricoreevents.online'}
              type="email"
              value={form.deliveryEmail}
            />
            <p className="mt-2 text-xs text-slate-500">
              Leave this blank to use the current primary full-access admin email.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:w-56">
          <button className="btn-primary" disabled={savePending} type="submit">
            {savePending ? 'Saving...' : 'Save OTP Settings'}
          </button>
        </div>
      </form>
    </section>
  );
}
