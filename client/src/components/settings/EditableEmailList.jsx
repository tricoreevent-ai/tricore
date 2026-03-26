// Render an editable email list so admins can add, change, and remove recipients inline.
export default function EditableEmailList({
  addLabel = 'Add Email',
  description,
  emails = [],
  emptyMessage = 'No recipient emails configured yet.',
  onChange,
  placeholder = 'team@tricoreevents.online',
  title
}) {
  const handleEmailChange = (index, value) => {
    onChange(
      emails.map((email, currentIndex) => (currentIndex === index ? value : email))
    );
  };

  const handleAddEmail = () => {
    onChange([...emails, '']);
  };

  const handleRemoveEmail = (index) => {
    onChange(emails.filter((_, currentIndex) => currentIndex !== index));
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
        <button className="btn-secondary" onClick={handleAddEmail} type="button">
          {addLabel}
        </button>
      </div>

      {emails.length ? (
        <div className="mt-5 space-y-3">
          {emails.map((email, index) => (
            <div className="grid gap-3 md:grid-cols-[1fr_auto]" key={`${title}-${index}`}>
              <input
                className="input"
                onChange={(event) => handleEmailChange(index, event.target.value)}
                placeholder={placeholder}
                type="email"
                value={email}
              />
              <button
                className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                onClick={() => handleRemoveEmail(index)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}
