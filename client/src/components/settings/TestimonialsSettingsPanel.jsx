import { useEffect, useMemo, useState } from 'react';

import FormAlert from '../common/FormAlert.jsx';

const createTestimonialId = () =>
  globalThis.crypto?.randomUUID?.() || `testimonial-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sanitizeTestimonial = (testimonial = {}) => ({
  id: String(testimonial.id || '').trim() || createTestimonialId(),
  name: String(testimonial.name || '').trim(),
  role: String(testimonial.role || '').trim(),
  quote: String(testimonial.quote || '').trim(),
  imageUrl: String(testimonial.imageUrl || '').trim(),
  imageAlt: String(testimonial.imageAlt || '').trim(),
  avatarUrl: String(testimonial.avatarUrl || '').trim(),
  avatarAlt: String(testimonial.avatarAlt || '').trim()
});

const sanitizeForm = (form = {}) => ({
  ...form,
  testimonialsEnabledHome: Boolean(form.testimonialsEnabledHome),
  testimonialsTitle: String(form.testimonialsTitle || '').trim(),
  testimonialsDescription: String(form.testimonialsDescription || '').trim(),
  testimonials: Array.isArray(form.testimonials)
    ? form.testimonials.map((testimonial) => sanitizeTestimonial(testimonial))
    : []
});

const createEmptyTestimonial = () =>
  sanitizeTestimonial({
    id: createTestimonialId(),
    name: '',
    role: '',
    quote: '',
    imageUrl: '',
    imageAlt: '',
    avatarUrl: '',
    avatarAlt: ''
  });

const moveItem = (items, sourceIndex, destinationIndex) => {
  if (
    sourceIndex < 0 ||
    destinationIndex < 0 ||
    sourceIndex >= items.length ||
    destinationIndex >= items.length ||
    sourceIndex === destinationIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(destinationIndex, 0, movedItem);
  return nextItems;
};

export default function TestimonialsSettingsPanel({
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

  const testimonialSummary = useMemo(
    () => ({
      total: Array.isArray(form?.testimonials) ? form.testimonials.length : 0,
      enabled: Boolean(form?.testimonialsEnabledHome)
    }),
    [form]
  );

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
    setLocalError('');
  };

  const updateTestimonial = (testimonialId, field, value) => {
    setForm((current) => ({
      ...current,
      testimonials: (current?.testimonials || []).map((testimonial) =>
        testimonial.id === testimonialId ? { ...testimonial, [field]: value } : testimonial
      )
    }));
    setLocalError('');
  };

  const handleAddTestimonial = () => {
    setForm((current) => ({
      ...current,
      testimonials: [...(current?.testimonials || []), createEmptyTestimonial()]
    }));
    setLocalError('');
  };

  const handleDeleteTestimonial = (testimonialId) => {
    setForm((current) => ({
      ...current,
      testimonials: (current?.testimonials || []).filter(
        (testimonial) => testimonial.id !== testimonialId
      )
    }));
    setLocalError('');
  };

  const handleMoveTestimonial = (index, direction) => {
    const destinationIndex = direction === 'up' ? index - 1 : index + 1;

    setForm((current) => ({
      ...current,
      testimonials: moveItem(current?.testimonials || [], index, destinationIndex)
    }));
    setLocalError('');
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const payload = sanitizeForm(form || {});

    if (payload.testimonials.length > 6) {
      setLocalError('A maximum of 6 testimonials is allowed.');
      return;
    }

    const incompleteTestimonial = payload.testimonials.find(
      (testimonial) => !testimonial.name || !testimonial.quote
    );

    if (incompleteTestimonial) {
      setLocalError('Each testimonial needs both a name and a quote before saving.');
      return;
    }

    if (payload.testimonialsEnabledHome && !payload.testimonials.length) {
      setLocalError('Add at least one testimonial before enabling the homepage testimonial section.');
      return;
    }

    await onSave(payload);
  };

  if (!form) {
    return null;
  }

  return (
    <form className="space-y-8" onSubmit={handleSave}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Homepage Testimonials
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{testimonialSummary.total}</p>
          <p className="mt-2 text-sm text-slate-500">
            {testimonialSummary.enabled
              ? 'Visible on the public homepage.'
              : 'Hidden from the public homepage.'}
          </p>
        </div>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Visibility
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-950">
            {testimonialSummary.enabled ? 'Enabled' : 'Disabled'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Keep the section optional until you have real client feedback ready to publish.
          </p>
        </div>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Recommendation
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-950">Use real feedback</p>
          <p className="mt-2 text-sm text-slate-500">
            Add short, specific testimonials from communities or organizations once permission is confirmed.
          </p>
        </div>
      </div>

      <section className="panel space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Testimonials Section</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Enable or disable homepage testimonials just like the gallery, and manage each testimonial card from here.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" onClick={onRefresh} type="button">
              Refresh
            </button>
            <button className="btn-secondary" onClick={handleAddTestimonial} type="button">
              Add Testimonial
            </button>
          </div>
        </div>

        <FormAlert message={error || localError} />
        <FormAlert message={message} type="success" />

        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
              <input
                checked={Boolean(form.testimonialsEnabledHome)}
                onChange={(event) => updateField('testimonialsEnabledHome', event.target.checked)}
                type="checkbox"
              />
              Enable homepage testimonials
            </label>

            <div>
              <label className="label" htmlFor="testimonials-title">
                Section Title
              </label>
              <input
                className="input"
                id="testimonials-title"
                onChange={(event) => updateField('testimonialsTitle', event.target.value)}
                value={form.testimonialsTitle}
              />
            </div>

            <div>
              <label className="label" htmlFor="testimonials-description">
                Section Description
              </label>
              <textarea
                className="input min-h-28"
                id="testimonials-description"
                onChange={(event) => updateField('testimonialsDescription', event.target.value)}
                value={form.testimonialsDescription}
              />
            </div>

            <div className="rounded-[1.5rem] bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                Publishing note
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Disable the section any time without deleting the saved testimonials.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
            {form.testimonials.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {form.testimonials.map((testimonial, index) => (
                  <article
                    className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5"
                    key={testimonial.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                        Testimonial {index + 1}
                      </p>
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary px-4"
                          disabled={index === 0}
                          onClick={() => handleMoveTestimonial(index, 'up')}
                          type="button"
                        >
                          Up
                        </button>
                        <button
                          className="btn-secondary px-4"
                          disabled={index === form.testimonials.length - 1}
                          onClick={() => handleMoveTestimonial(index, 'down')}
                          type="button"
                        >
                          Down
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="label" htmlFor={`testimonial-name-${testimonial.id}`}>
                          Name
                        </label>
                        <input
                          className="input"
                          id={`testimonial-name-${testimonial.id}`}
                          onChange={(event) =>
                            updateTestimonial(testimonial.id, 'name', event.target.value)
                          }
                          placeholder="Client or organizer name"
                          value={testimonial.name}
                        />
                      </div>

                      <div>
                        <label className="label" htmlFor={`testimonial-role-${testimonial.id}`}>
                          Role / Context
                        </label>
                        <input
                          className="input"
                          id={`testimonial-role-${testimonial.id}`}
                          onChange={(event) =>
                            updateTestimonial(testimonial.id, 'role', event.target.value)
                          }
                          placeholder="Community Organizer"
                          value={testimonial.role}
                        />
                      </div>

                      <div>
                        <label className="label" htmlFor={`testimonial-quote-${testimonial.id}`}>
                          Quote
                        </label>
                        <textarea
                          className="input min-h-32"
                          id={`testimonial-quote-${testimonial.id}`}
                          onChange={(event) =>
                            updateTestimonial(testimonial.id, 'quote', event.target.value)
                          }
                          placeholder="Share the client feedback here."
                          value={testimonial.quote}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                        onClick={() => handleDeleteTestimonial(testimonial.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-[linear-gradient(135deg,#f8fafc,#e0f2fe)] p-10 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Homepage Testimonials
                </p>
                <h3 className="mt-3 text-2xl font-bold text-slate-950">No testimonials yet</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  Add client feedback here, then enable the section when you are ready to publish it on the homepage.
                </p>
                <button className="btn-primary mt-6" onClick={handleAddTestimonial} type="button">
                  Add First Testimonial
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn-primary" disabled={savePending} type="submit">
            {savePending ? 'Saving...' : 'Save Testimonial Settings'}
          </button>
        </div>
      </section>
    </form>
  );
}
