import { useEffect, useMemo, useState } from 'react';

import FormAlert from '../common/FormAlert.jsx';
import TypeaheadSelect from '../common/TypeaheadSelect.jsx';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const templateStyleOptions = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'executive', label: 'Executive' }
];

const sanitizeForm = (config = {}) => ({
  companyName: String(config.companyName || '').trim(),
  companyEmail: String(config.companyEmail || '').trim(),
  companyWebsite: String(config.companyWebsite || '').trim(),
  companyLogoUrl: String(config.companyLogoUrl || '').trim(),
  invoicePrefix: String(config.invoicePrefix || '').trim(),
  invoiceNumberFormat: String(config.invoiceNumberFormat || '').trim(),
  nextSequenceNumber: Number(config.nextSequenceNumber || 1),
  defaultTaxLabel: String(config.defaultTaxLabel || '').trim(),
  defaultTaxRate:
    config.defaultTaxRate === undefined || config.defaultTaxRate === null
      ? 0
      : Number(config.defaultTaxRate),
  paymentTermsLabel: String(config.paymentTermsLabel || '').trim(),
  paymentTermsDays:
    config.paymentTermsDays === undefined || config.paymentTermsDays === null
      ? 15
      : Number(config.paymentTermsDays),
  footerNotes: String(config.footerNotes || '').trim(),
  footerTerms: String(config.footerTerms || '').trim(),
  defaultTemplateStyle: String(config.defaultTemplateStyle || 'modern').trim() || 'modern'
});

// Mirror the backend token replacement so admins can preview the next generated number.
const buildPreviewDocumentNumber = (form) => {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const sequence = Math.max(1, Number(form.nextSequenceNumber || 1));
  const replacements = {
    '{PREFIX}': form.invoicePrefix || 'TRI',
    '{YYYY}': year,
    '{YY}': year.slice(-2),
    '{MM}': month,
    '{SEQ}': String(sequence),
    '{SEQ4}': String(sequence).padStart(4, '0'),
    '{SEQ5}': String(sequence).padStart(5, '0'),
    '{SEQ6}': String(sequence).padStart(6, '0')
  };

  return Object.entries(replacements).reduce(
    (value, [token, replacement]) => value.split(token).join(replacement),
    form.invoiceNumberFormat || '{PREFIX}-{YYYY}-{SEQ4}'
  );
};

export default function InvoiceSettingsPanel({
  config,
  error,
  message,
  onRefresh,
  onSave,
  savePending
}) {
  const [form, setForm] = useState(null);
  const [localError, setLocalError] = useState('');
  const previewDocumentNumber = useMemo(
    () => buildPreviewDocumentNumber(form || {}),
    [form]
  );

  useEffect(() => {
    setForm(config ? sanitizeForm(config) : null);
    setLocalError('');
  }, [config]);

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
    setLocalError('');
  };

  const handleLogoUpload = (file) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField('companyLogoUrl', String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const payload = sanitizeForm(form || {});

    if (!payload.companyName) {
      setLocalError('Company name is required.');
      return;
    }

    if (!emailPattern.test(payload.companyEmail)) {
      setLocalError('Enter a valid company email address.');
      return;
    }

    try {
      new URL(payload.companyWebsite);
    } catch {
      setLocalError('Enter a valid company website URL.');
      return;
    }

    await onSave(payload);
  };

  if (!form) {
    return null;
  }

  return (
    <form className="space-y-8" onSubmit={handleSave}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Next Invoice
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{previewDocumentNumber}</p>
          <p className="mt-2 text-sm text-slate-500">
            Live preview based on the current prefix, numbering format, and next sequence value.
          </p>
        </div>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Tax Default
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {form.defaultTaxLabel || 'No Label'} {form.defaultTaxRate ? `(${form.defaultTaxRate}%)` : ''}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            New accounting invoices inherit this tax setup unless staff overrides it on the transaction.
          </p>
        </div>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Template Style
          </p>
          <p className="mt-3 text-2xl font-bold capitalize text-slate-950">
            {form.defaultTemplateStyle}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Change the default invoice visual treatment without editing print code.
          </p>
        </div>
      </div>

      <section className="panel space-y-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Invoice Configuration</h2>
            <p className="mt-2 text-sm text-slate-500">
              Centralize invoice branding, numbering, tax defaults, payment terms, and footer copy.
            </p>
          </div>
          <button className="btn-secondary" onClick={onRefresh} type="button">
            Refresh
          </button>
        </div>

        <FormAlert message={error || localError} />
        <FormAlert message={message} type="success" />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="companyName">
              Company Name
            </label>
            <input
              className="input"
              id="companyName"
              onChange={(event) => updateField('companyName', event.target.value)}
              value={form.companyName}
            />
          </div>

          <div>
            <label className="label" htmlFor="companyEmail">
              Company Email
            </label>
            <input
              className="input"
              id="companyEmail"
              onChange={(event) => updateField('companyEmail', event.target.value)}
              type="email"
              value={form.companyEmail}
            />
          </div>

          <div>
            <label className="label" htmlFor="companyWebsite">
              Company Website
            </label>
            <input
              className="input"
              id="companyWebsite"
              onChange={(event) => updateField('companyWebsite', event.target.value)}
              value={form.companyWebsite}
            />
          </div>

          <div>
            <label className="label" htmlFor="companyLogoUrl">
              Company Logo URL
            </label>
            <input
              className="input"
              id="companyLogoUrl"
              onChange={(event) => updateField('companyLogoUrl', event.target.value)}
              placeholder="/uploads/branding/invoice-logo.png"
              value={form.companyLogoUrl}
            />
          </div>

          <div className="md:col-span-2">
            <label className="label" htmlFor="invoiceLogoUpload">
              Upload Company Logo
            </label>
            <input
              accept="image/*"
              className="input"
              id="invoiceLogoUpload"
              onChange={(event) => handleLogoUpload(event.target.files?.[0])}
              type="file"
            />
            <p className="mt-2 text-xs text-slate-500">
              Uploaded logos are stored on this server and reused by the invoice print template.
            </p>
            {form.companyLogoUrl ? (
              <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                <img
                  alt="Invoice brand logo preview"
                  className="max-h-28 rounded-2xl object-contain"
                  src={form.companyLogoUrl}
                />
              </div>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="invoicePrefix">
              Invoice Prefix
            </label>
            <input
              className="input"
              id="invoicePrefix"
              onChange={(event) => updateField('invoicePrefix', event.target.value)}
              placeholder="TRI"
              value={form.invoicePrefix}
            />
          </div>

          <div>
            <label className="label" htmlFor="invoiceNumberFormat">
              Numbering Format
            </label>
            <input
              className="input"
              id="invoiceNumberFormat"
              onChange={(event) => updateField('invoiceNumberFormat', event.target.value)}
              placeholder="{PREFIX}-{YYYY}-{SEQ4}"
              value={form.invoiceNumberFormat}
            />
            <p className="mt-2 text-xs text-slate-500">
              Supported tokens: `{'{PREFIX}'}`, `{'{YYYY}'}`, `{'{YY}'}`, `{'{MM}'}`, `{'{SEQ}'}`, `{'{SEQ4}'}`, `{'{SEQ5}'}`, `{'{SEQ6}'}`.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="defaultTaxLabel">
              Default Tax Label
            </label>
            <input
              className="input"
              id="defaultTaxLabel"
              onChange={(event) => updateField('defaultTaxLabel', event.target.value)}
              placeholder="GST"
              value={form.defaultTaxLabel}
            />
          </div>

          <div>
            <label className="label" htmlFor="defaultTaxRate">
              Default Tax Rate (%)
            </label>
            <input
              className="input"
              id="defaultTaxRate"
              min="0"
              onChange={(event) => updateField('defaultTaxRate', event.target.value)}
              step="0.01"
              type="number"
              value={form.defaultTaxRate}
            />
          </div>

          <div>
            <label className="label" htmlFor="paymentTermsLabel">
              Payment Terms Label
            </label>
            <input
              className="input"
              id="paymentTermsLabel"
              onChange={(event) => updateField('paymentTermsLabel', event.target.value)}
              placeholder="Due within 15 days from invoice date."
              value={form.paymentTermsLabel}
            />
          </div>

          <div>
            <label className="label" htmlFor="paymentTermsDays">
              Default Due Days
            </label>
            <input
              className="input"
              id="paymentTermsDays"
              min="0"
              onChange={(event) => updateField('paymentTermsDays', event.target.value)}
              type="number"
              value={form.paymentTermsDays}
            />
          </div>

          <div>
            <label className="label" htmlFor="defaultTemplateStyle">
              Default Template Style
            </label>
            <TypeaheadSelect
              id="defaultTemplateStyle"
              name="defaultTemplateStyle"
              onChange={(event) => updateField('defaultTemplateStyle', event.target.value)}
              options={templateStyleOptions}
              placeholder="Select style"
              searchPlaceholder="Search styles"
              value={form.defaultTemplateStyle}
            />
          </div>

          <div>
            <label className="label" htmlFor="footerNotes">
              Footer Note
            </label>
            <textarea
              className="input min-h-24"
              id="footerNotes"
              onChange={(event) => updateField('footerNotes', event.target.value)}
              placeholder="Sarva Horizon is the Event Partner."
              value={form.footerNotes}
            />
          </div>

          <div className="md:col-span-2">
            <label className="label" htmlFor="footerTerms">
              Terms and Conditions
            </label>
            <textarea
              className="input min-h-40"
              id="footerTerms"
              onChange={(event) => updateField('footerTerms', event.target.value)}
              placeholder="Add one term per line."
              value={form.footerTerms}
            />
            <p className="mt-2 text-xs text-slate-500">
              Each new line is rendered as a separate legal or billing term in the invoice footer.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn-primary" disabled={savePending} type="submit">
            {savePending ? 'Saving...' : 'Save Invoice Settings'}
          </button>
        </div>
      </section>
    </form>
  );
}
