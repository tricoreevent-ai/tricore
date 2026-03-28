import { useEffect, useState } from 'react';

import FormAlert from '../common/FormAlert.jsx';

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const sanitizeForm = (form = {}) => ({
  ...form,
  themePrimaryColor: String(form.themePrimaryColor || '').trim(),
  themeSecondaryColor: String(form.themeSecondaryColor || '').trim(),
  themeHighlightColor: String(form.themeHighlightColor || '').trim(),
  sponsorshipEventName: String(form.sponsorshipEventName || '').trim()
});

export default function HomePageContentSettingsPanel({
  config,
  error,
  message,
  onRefresh,
  onSave,
  savePending
}) {
  const [form, setForm] = useState(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setForm(config ? sanitizeForm(config) : null);
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

    const payload = sanitizeForm(form || {});

    if (
      !hexColorPattern.test(payload.themePrimaryColor) ||
      !hexColorPattern.test(payload.themeSecondaryColor) ||
      !hexColorPattern.test(payload.themeHighlightColor)
    ) {
      setLocalError('Enter valid hex colors like #0F5FDB for all homepage theme fields.');
      return;
    }

    await onSave(payload);
  };

  if (!form) {
    return null;
  }

  return (
    <form className="mt-8 space-y-8" onSubmit={handleSave}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Homepage Theme</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Keep homepage content intact while adjusting the brand color direction used across the public landing experience.
          </p>
        </div>
        <button className="btn-secondary" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      <FormAlert message={error || localError} />
      <FormAlert message={message} type="success" />

      <section className="panel space-y-6 p-6">
        <div>
          <h3 className="text-2xl font-bold">Theme Colors</h3>
          <p className="mt-2 text-sm text-slate-500">
            These values control the default homepage blues. Gallery and testimonial content are managed in the dedicated sections below.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label" htmlFor="themePrimaryColor">
              Primary Blue
            </label>
            <div className="flex gap-3">
              <input
                className="h-12 w-16 rounded-2xl border border-slate-200 bg-white p-1"
                id="themePrimaryColor"
                onChange={(event) => updateField('themePrimaryColor', event.target.value)}
                type="color"
                value={form.themePrimaryColor}
              />
              <input
                className="input"
                onChange={(event) => updateField('themePrimaryColor', event.target.value)}
                value={form.themePrimaryColor}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="themeSecondaryColor">
              Deep Blue
            </label>
            <div className="flex gap-3">
              <input
                className="h-12 w-16 rounded-2xl border border-slate-200 bg-white p-1"
                id="themeSecondaryColor"
                onChange={(event) => updateField('themeSecondaryColor', event.target.value)}
                type="color"
                value={form.themeSecondaryColor}
              />
              <input
                className="input"
                onChange={(event) => updateField('themeSecondaryColor', event.target.value)}
                value={form.themeSecondaryColor}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="themeHighlightColor">
              Accent Blue
            </label>
            <div className="flex gap-3">
              <input
                className="h-12 w-16 rounded-2xl border border-slate-200 bg-white p-1"
                id="themeHighlightColor"
                onChange={(event) => updateField('themeHighlightColor', event.target.value)}
                type="color"
                value={form.themeHighlightColor}
              />
              <input
                className="input"
                onChange={(event) => updateField('themeHighlightColor', event.target.value)}
                value={form.themeHighlightColor}
              />
            </div>
          </div>
        </div>

        <div
          className="rounded-[2rem] p-6 text-white"
          style={{
            backgroundImage: `linear-gradient(135deg, ${form.themeSecondaryColor}, ${form.themePrimaryColor}, ${form.themeHighlightColor})`
          }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
            Theme Preview
          </p>
          <h4 className="mt-3 text-2xl font-bold">TriCore homepage color direction</h4>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-50">
            Use the banner carousel above for optional slide images. Use the colors here when you
            want the homepage background to stay on-brand but shift to a lighter, darker, or richer
            blue.
          </p>
        </div>
      </section>

      <section className="panel space-y-6 p-6">
        <div>
          <h3 className="text-2xl font-bold">Sponsorship Page</h3>
          <p className="mt-2 text-sm text-slate-500">
            Configure the featured event name shown on the public sponsorship details page.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
          <div>
            <label className="label" htmlFor="sponsorshipEventName">
              Sponsorship Event Name
            </label>
            <input
              className="input"
              id="sponsorshipEventName"
              onChange={(event) => updateField('sponsorshipEventName', event.target.value)}
              placeholder="Corporate Cricket Tournament 2026"
              value={form.sponsorshipEventName}
            />
            <p className="mt-2 text-xs text-slate-500">
              This title is reused on the public sponsorship page without changing code.
            </p>
          </div>

          <div
            className="rounded-[2rem] p-6 text-white"
            style={{
              backgroundImage: `linear-gradient(145deg, ${form.themeSecondaryColor}, ${form.themePrimaryColor}, ${form.themeHighlightColor})`
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
              Sponsorship Preview
            </p>
            <h4 className="mt-3 text-2xl font-bold">
              {form.sponsorshipEventName || 'Corporate Cricket Tournament 2026'}
            </h4>
            <p className="mt-3 max-w-xl text-sm leading-7 text-blue-50">
              The sponsorship page uses this event name inside the hero section and partner narrative.
            </p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button className="btn-primary" disabled={savePending} type="submit">
          {savePending ? 'Saving...' : 'Save Theme Settings'}
        </button>
      </div>
    </form>
  );
}
