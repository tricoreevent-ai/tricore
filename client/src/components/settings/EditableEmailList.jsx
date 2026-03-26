import { useMemo, useState } from 'react';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const splitEmailCandidates = (value) =>
  String(value || '')
    .split(/[\n,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export default function EditableEmailList({
  addLabel = 'Add Email',
  description,
  emails = [],
  emptyMessage = 'No recipient emails configured yet.',
  onChange,
  placeholder = 'team@tricoreevents.online',
  title
}) {
  const [draftEmail, setDraftEmail] = useState('');
  const [error, setError] = useState('');

  const normalizedEmails = useMemo(
    () =>
      Array.from(
        new Set(
          emails
            .map((email) => String(email || '').trim().toLowerCase())
            .filter(Boolean)
        )
      ),
    [emails]
  );

  const commitDraftEmail = () => {
    const candidates = splitEmailCandidates(draftEmail);

    if (!candidates.length) {
      setError('Enter a valid email address before adding it to the list.');
      return;
    }

    const invalidEmail = candidates.find((email) => !emailPattern.test(email));

    if (invalidEmail) {
      setError(`"${invalidEmail}" is not a valid email address.`);
      return;
    }

    const duplicateEmail = candidates.find((email) => normalizedEmails.includes(email));

    if (duplicateEmail) {
      setError(`"${duplicateEmail}" is already in this list.`);
      return;
    }

    onChange([...normalizedEmails, ...candidates]);
    setDraftEmail('');
    setError('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      commitDraftEmail();
    }
  };

  const handleRemoveEmail = (emailToRemove) => {
    onChange(normalizedEmails.filter((email) => email !== emailToRemove));
    setError('');
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950">{title}</h3>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          ) : null}
        </div>
        <button className="btn-secondary" onClick={commitDraftEmail} type="button">
          {addLabel}
        </button>
      </div>

      <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {normalizedEmails.length ? (
            normalizedEmails.map((email) => (
              <span
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-brand-mist px-3 py-2 text-sm font-medium text-brand-blue"
                key={`${title}-${email}`}
              >
                <span className="truncate">{email}</span>
                <button
                  aria-label={`Remove ${email}`}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-blue transition hover:bg-blue-100"
                  onClick={() => handleRemoveEmail(email)}
                  type="button"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="input"
            onChange={(event) => {
              setDraftEmail(event.target.value);
              if (error) {
                setError('');
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            type="email"
            value={draftEmail}
          />
          <button className="btn-primary" onClick={commitDraftEmail} type="button">
            Add to List
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Press `Enter`, comma, or click `Add to List` to save an email into this recipient group.
        </p>
        {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}
