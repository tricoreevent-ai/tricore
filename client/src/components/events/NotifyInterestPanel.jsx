import { useEffect, useState } from 'react';

import { expressInterestInEvent } from '../../api/eventsApi.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

const buildInitialForm = (user) => ({
  name: user?.name || '',
  email: user?.email || '',
  phone: ''
});

export default function NotifyInterestPanel({ event }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => buildInitialForm(user));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setForm(buildInitialForm(user));
    setError('');
    setSuccess('');
  }, [user, event?._id]);

  const handleChange = (eventValue) => {
    const { name, value } = eventValue.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (eventValue) => {
    eventValue.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await expressInterestInEvent(event._id, form);
      setSuccess(response?.message || 'We will notify you when registration opens.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to save your notify-later request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <h3 className="text-2xl font-bold text-slate-950">Notify Me When Registration Opens</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          This event is in the coming-soon window. Leave your details and TriCore will email you
          as soon as registrations go live.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="notify-name">
            Name
          </label>
          <input
            className="input"
            id="notify-name"
            name="name"
            onChange={handleChange}
            required
            value={form.name}
          />
        </div>
        <div>
          <label className="label" htmlFor="notify-email">
            Email
          </label>
          <input
            className="input"
            id="notify-email"
            name="email"
            onChange={handleChange}
            required
            type="email"
            value={form.email}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="notify-phone">
            Phone Number (optional)
          </label>
          <input
            className="input"
            id="notify-phone"
            name="phone"
            onChange={handleChange}
            value={form.phone}
          />
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
      {success ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>
      ) : null}

      <button className="btn-primary" disabled={submitting} type="submit">
        {submitting ? 'Saving...' : 'Notify Later'}
      </button>
    </form>
  );
}
