import { useEffect, useState } from 'react';

import FormAlert from '../common/FormAlert.jsx';
import TypeaheadSelect from '../common/TypeaheadSelect.jsx';

const defaultState = {
  name: '',
  description: '',
  bannerImage: '',
  sportType: 'Cricket',
  venue: '',
  startDate: '',
  endDate: '',
  maxParticipants: 8,
  entryFee: 0,
  registrationDeadline: '',
  registrationStartDate: '',
  teamSize: 11,
  playerLimit: 15,
  registrationEnabled: true
};

const sportTypeOptions = [
  { value: 'Cricket', label: 'Cricket' },
  { value: 'Football', label: 'Football' },
  { value: 'Badminton', label: 'Badminton' },
  { value: 'Swimming', label: 'Swimming' }
];

const toDateTimeLocalValue = (value) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const localTime = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60 * 1000);
  return localTime.toISOString().slice(0, 16);
};

const getEventErrors = (form) => {
  const errors = {};
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (!form.name?.trim() || form.name.trim().length < 3) {
    errors.name = 'Event name must be at least 3 characters.';
  }

  if (!form.venue?.trim() || form.venue.trim().length < 3) {
    errors.venue = 'Venue must be at least 3 characters.';
  }

  if (form.bannerImage?.trim()) {
    try {
      new URL(form.bannerImage.trim());
    } catch {
      errors.bannerImage = 'Banner image must be a valid URL.';
    }
  }

  if (!form.startDate) {
    errors.startDate = 'Start date is required.';
  }

  if (!form.endDate) {
    errors.endDate = 'End date is required.';
  }

  if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
    errors.endDate = 'End date must be on or after the start date.';
  }

  if (Boolean(form.registrationStartDate) !== Boolean(form.registrationDeadline)) {
    errors.registrationStartDate =
      'Enter both registration dates or leave both blank to keep this event as Coming Soon.';
  }

  if (form.registrationStartDate && form.registrationDeadline && form.startDate) {
    const registrationStart = new Date(form.registrationStartDate);
    const registrationDeadline = new Date(form.registrationDeadline);
    registrationDeadline.setHours(23, 59, 59, 999);
    const eventStart = new Date(form.startDate);
    eventStart.setHours(23, 59, 59, 999);

    if (registrationStart > registrationDeadline) {
      errors.registrationStartDate =
        'Registration start date must be before the registration deadline.';
    }

    if (registrationDeadline > eventStart) {
      errors.registrationDeadline = 'Registration deadline must be on or before the start date.';
    }

    if (eventStart >= todayStart) {
      if (registrationStart < todayStart || registrationDeadline < todayStart) {
        errors.registrationStartDate = 'Registration dates must be today or in the future.';
      }
    }
  }

  if (Number(form.maxParticipants) < 1) {
    errors.maxParticipants = 'Max participants must be at least 1.';
  }

  if (Number(form.entryFee) < 0) {
    errors.entryFee = 'Entry fee cannot be negative.';
  }

  if (Number(form.teamSize) < 1) {
    errors.teamSize = 'Team size must be at least 1.';
  }

  if (Number(form.playerLimit) < 1) {
    errors.playerLimit = 'Player limit must be at least 1.';
  }

  if (Number(form.playerLimit) < Number(form.teamSize)) {
    errors.playerLimit = 'Player limit must be greater than or equal to team size.';
  }

  return errors;
};

export default function EventForm({
  initialValues,
  onCancel,
  onSubmit,
  submitting,
  errorMessage,
  successMessage
}) {
  const [form, setForm] = useState(initialValues || defaultState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(initialValues || defaultState);
    setErrors({});
  }, [initialValues]);

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));

    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = getEventErrors(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit({
      ...form,
      registrationStartDate: form.registrationStartDate
        ? new Date(form.registrationStartDate).toISOString()
        : ''
    });
  };

  const renderFieldError = (field) =>
    errors[field] ? <p className="mt-2 text-xs font-medium text-red-600">{errors[field]}</p> : null;

  return (
    <form className="panel space-y-6 p-6" onSubmit={handleSubmit}>
      <div>
        <h3 className="text-xl font-bold">{form._id ? 'Edit Event' : 'Create Event'}</h3>
        <p className="mt-2 text-sm text-slate-500">Configure sports event settings, registration rules, and participant limits.</p>
      </div>

      <FormAlert message={errorMessage} />
      <FormAlert message={successMessage} type="success" />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label" htmlFor="name">
            Event Name
          </label>
          <input className="input" id="name" name="name" onChange={handleChange} required value={form.name} />
          {renderFieldError('name')}
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea className="input min-h-28" id="description" name="description" onChange={handleChange} value={form.description} />
        </div>
        <div>
          <label className="label" htmlFor="sportType">
            Sport Type
          </label>
          <TypeaheadSelect
            id="sportType"
            name="sportType"
            onChange={handleChange}
            options={sportTypeOptions}
            placeholder="Select sport type"
            searchPlaceholder="Search sports"
            value={form.sportType}
          />
        </div>
        <div>
          <label className="label" htmlFor="venue">
            Venue
          </label>
          <input className="input" id="venue" name="venue" onChange={handleChange} required value={form.venue} />
          {renderFieldError('venue')}
        </div>
        <div>
          <label className="label" htmlFor="startDate">
            Start Date
          </label>
          <input className="input" id="startDate" name="startDate" onChange={handleChange} required type="date" value={form.startDate?.slice(0, 10) || ''} />
          {renderFieldError('startDate')}
        </div>
        <div>
          <label className="label" htmlFor="endDate">
            End Date
          </label>
          <input className="input" id="endDate" name="endDate" onChange={handleChange} required type="date" value={form.endDate?.slice(0, 10) || ''} />
          {renderFieldError('endDate')}
        </div>
        <div>
          <label className="label" htmlFor="registrationDeadline">
            Registration Deadline <span className="text-slate-400">(optional)</span>
          </label>
          <input
            className="input"
            id="registrationDeadline"
            name="registrationDeadline"
            onChange={handleChange}
            type="date"
            value={form.registrationDeadline?.slice(0, 10) || ''}
          />
          {renderFieldError('registrationDeadline')}
        </div>
        <div>
          <label className="label" htmlFor="registrationStartDate">
            Registration Start Date <span className="text-slate-400">(optional)</span>
          </label>
          <input
            className="input"
            id="registrationStartDate"
            name="registrationStartDate"
            onChange={handleChange}
            type="datetime-local"
            value={toDateTimeLocalValue(form.registrationStartDate)}
          />
          {renderFieldError('registrationStartDate')}
          <p className="mt-2 text-xs text-slate-500">
            Leave both registration dates blank to publish the event as Coming Soon with Notify Later.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="bannerImage">
            Banner Image URL
          </label>
          <input className="input" id="bannerImage" name="bannerImage" onChange={handleChange} value={form.bannerImage} />
          {renderFieldError('bannerImage')}
        </div>
        <div>
          <label className="label" htmlFor="maxParticipants">
            Max Participants / Teams
          </label>
          <input className="input" id="maxParticipants" min="1" name="maxParticipants" onChange={handleChange} required type="number" value={form.maxParticipants} />
          {renderFieldError('maxParticipants')}
        </div>
        <div>
          <label className="label" htmlFor="entryFee">
            Entry Fee
          </label>
          <input className="input" id="entryFee" min="0" name="entryFee" onChange={handleChange} required type="number" value={form.entryFee} />
          {renderFieldError('entryFee')}
        </div>
        <div>
          <label className="label" htmlFor="teamSize">
            Team Size
          </label>
          <input className="input" id="teamSize" min="1" name="teamSize" onChange={handleChange} required type="number" value={form.teamSize} />
          {renderFieldError('teamSize')}
        </div>
        <div>
          <label className="label" htmlFor="playerLimit">
            Player Limit
          </label>
          <input className="input" id="playerLimit" min="1" name="playerLimit" onChange={handleChange} required type="number" value={form.playerLimit} />
          {renderFieldError('playerLimit')}
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
        <input checked={form.registrationEnabled} name="registrationEnabled" onChange={handleChange} type="checkbox" />
        Registration enabled
      </label>

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : form._id ? 'Update Event' : 'Create Event'}
        </button>
        {form._id ? (
          <button className="btn-secondary" onClick={onCancel} type="button">
            Cancel Edit
          </button>
        ) : null}
      </div>
    </form>
  );
}
