import { useEffect, useMemo, useState } from 'react';

import FormAlert from '../common/FormAlert.jsx';

export default function WebsiteSettingsPanel({
  config,
  error,
  message,
  onRefresh,
  onSave,
  savePending
}) {
  const [publicBaseUrl, setPublicBaseUrl] = useState(config?.publicBaseUrl || '');

  useEffect(() => {
    setPublicBaseUrl(config?.publicBaseUrl || '');
  }, [config]);

  const previewLink = useMemo(() => {
    const baseUrl = String(publicBaseUrl || '').trim().replace(/\/+$/, '');
    return baseUrl ? `${baseUrl}/events/example-event-id` : '';
  }, [publicBaseUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave({
      publicBaseUrl: publicBaseUrl.trim()
    });
  };

  return (
    <form className="panel space-y-6 p-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Website Links</h2>
          <p className="mt-2 text-sm text-slate-500">
            Set the base public domain used in registration links and event emails.
          </p>
        </div>
        <button className="btn-secondary" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      <FormAlert message={error} />
      <FormAlert message={message} type="success" />

      <div>
        <label className="label" htmlFor="publicBaseUrl">
          Public Website Base URL
        </label>
        <input
          className="input"
          id="publicBaseUrl"
          onChange={(event) => setPublicBaseUrl(event.target.value)}
          placeholder="https://www.tricoreevents.online"
          type="url"
          value={publicBaseUrl}
        />
        <p className="mt-2 text-xs text-slate-500">
          Use the full domain including `https://`. The system appends `/events/:eventId` when it
          builds registration links.
        </p>
      </div>

      <div className="rounded-[1.75rem] bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
          Link Preview
        </p>
        <p className="mt-3 break-all text-sm font-medium text-slate-700">
          {previewLink || 'Enter a base URL to preview the registration link pattern.'}
        </p>
      </div>

      <button className="btn-primary" disabled={savePending} type="submit">
        {savePending ? 'Saving...' : 'Save Website Settings'}
      </button>
    </form>
  );
}
