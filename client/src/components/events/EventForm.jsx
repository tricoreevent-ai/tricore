import { useEffect, useRef, useState } from 'react';

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

const isValidBannerImageReference = (value) => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return true;
  }

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(normalized)) {
    return true;
  }

  if (/^\/uploads\//.test(normalized)) {
    return true;
  }

  try {
    const url = new URL(normalized);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });

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

  if (!isValidBannerImageReference(form.bannerImage)) {
    errors.bannerImage = 'Banner image must be a valid URL or uploaded image.';
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

function FloatingField({
  error,
  id,
  inputRef,
  label,
  min,
  name,
  onChange,
  required = false,
  textarea = false,
  type = 'text',
  value
}) {
  const hasValue = value !== '' && value !== null && value !== undefined;
  const labelClassName = textarea
    ? hasValue
      ? 'floating-label'
      : 'floating-label floating-label-empty-textarea'
    : hasValue
      ? 'floating-label'
      : 'floating-label floating-label-empty';

  return (
    <div className="floating-field">
      {textarea ? (
        <textarea
          className={`floating-textarea peer ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`.trim()}
          id={id}
          name={name}
          onChange={onChange}
          placeholder={label}
          required={required}
          value={value}
        />
      ) : (
        <input
          className={`floating-input peer ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`.trim()}
          id={id}
          min={min}
          name={name}
          onChange={onChange}
          placeholder={label}
          ref={inputRef}
          required={required}
          type={type}
          value={value}
        />
      )}
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
    </div>
  );
}

export default function EventForm({
  autoFocusToken,
  initialValues,
  onCancel,
  onSubmit,
  submitting,
  errorMessage,
  successMessage
}) {
  const [form, setForm] = useState(initialValues || defaultState);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const eventNameInputRef = useRef(null);

  useEffect(() => {
    setForm(initialValues || defaultState);
    setErrors({});
  }, [initialValues]);

  useEffect(() => {
    if (!initialValues?._id) {
      return;
    }

    const scrollToEditor = window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      window.requestAnimationFrame(() => {
        eventNameInputRef.current?.focus();
        eventNameInputRef.current?.select?.();
      });
    });

    return () => window.cancelAnimationFrame(scrollToEditor);
  }, [autoFocusToken, initialValues?._id]);

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

  const handleBannerImageUpload = async (file) => {
    if (!file) {
      return;
    }

    try {
      const imageUrl = await readFileAsDataUrl(file);
      setForm((current) => ({
        ...current,
        bannerImage: imageUrl
      }));
      setErrors((current) => {
        if (!current.bannerImage) {
          return current;
        }

        const nextErrors = { ...current };
        delete nextErrors.bannerImage;
        return nextErrors;
      });
    } catch (uploadError) {
      setErrors((current) => ({
        ...current,
        bannerImage: uploadError.message || 'Unable to upload the banner image.'
      }));
    }
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
    <form className="panel space-y-6 p-6" onSubmit={handleSubmit} ref={formRef}>
      <div>
        <h3 className="text-xl font-bold">{form._id ? 'Edit Event' : 'Create Event'}</h3>
        <p className="mt-2 text-sm text-slate-500">Configure sports event settings, registration rules, and participant limits.</p>
      </div>

      <FormAlert message={errorMessage} />
      <FormAlert message={successMessage} type="success" />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <FloatingField
            error={errors.name}
            id="name"
            inputRef={eventNameInputRef}
            label="Event Name"
            name="name"
            onChange={handleChange}
            required
            value={form.name}
          />
          {renderFieldError('name')}
        </div>
        <div className="md:col-span-2">
          <FloatingField
            error={errors.description}
            id="description"
            label="Description"
            name="description"
            onChange={handleChange}
            textarea
            value={form.description}
          />
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
          <FloatingField
            error={errors.venue}
            id="venue"
            label="Venue"
            name="venue"
            onChange={handleChange}
            required
            value={form.venue}
          />
          {renderFieldError('venue')}
        </div>
        <div>
          <FloatingField
            error={errors.startDate}
            id="startDate"
            label="Start Date"
            name="startDate"
            onChange={handleChange}
            required
            type="date"
            value={form.startDate?.slice(0, 10) || ''}
          />
          {renderFieldError('startDate')}
        </div>
        <div>
          <FloatingField
            error={errors.endDate}
            id="endDate"
            label="End Date"
            name="endDate"
            onChange={handleChange}
            required
            type="date"
            value={form.endDate?.slice(0, 10) || ''}
          />
          {renderFieldError('endDate')}
        </div>
        <div>
          <FloatingField
            error={errors.registrationDeadline}
            id="registrationDeadline"
            label="Registration Deadline (optional)"
            name="registrationDeadline"
            onChange={handleChange}
            type="date"
            value={form.registrationDeadline?.slice(0, 10) || ''}
          />
          {renderFieldError('registrationDeadline')}
        </div>
        <div>
          <FloatingField
            error={errors.registrationStartDate}
            id="registrationStartDate"
            label="Registration Start Date (optional)"
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
          <FloatingField
            error={errors.bannerImage}
            id="bannerImage"
            label="Banner Image URL or /uploads path"
            name="bannerImage"
            onChange={handleChange}
            value={form.bannerImage}
          />
          {renderFieldError('bannerImage')}
          <p className="mt-2 text-xs text-slate-500">
            Paste an image URL or upload a banner file. Uploaded images are stored on this server and only
            the file path is saved in MongoDB.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="bannerImageUpload">
            Upload Banner Image
          </label>
          <input
            accept="image/*"
            className="input"
            id="bannerImageUpload"
            onChange={(event) => {
              void handleBannerImageUpload(event.target.files?.[0]);
              event.target.value = '';
            }}
            type="file"
          />
          {form.bannerImage ? (
            <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-3">
              <img
                alt={form.name || 'Event banner preview'}
                className="max-h-52 w-full rounded-2xl object-cover"
                src={form.bannerImage}
              />
            </div>
          ) : null}
        </div>
        <div>
          <FloatingField
            error={errors.maxParticipants}
            id="maxParticipants"
            label="Max Participants / Teams"
            min="1"
            name="maxParticipants"
            onChange={handleChange}
            required
            type="number"
            value={form.maxParticipants}
          />
          {renderFieldError('maxParticipants')}
        </div>
        <div>
          <FloatingField
            error={errors.entryFee}
            id="entryFee"
            label="Entry Fee"
            min="0"
            name="entryFee"
            onChange={handleChange}
            required
            type="number"
            value={form.entryFee}
          />
          {renderFieldError('entryFee')}
        </div>
        <div>
          <FloatingField
            error={errors.teamSize}
            id="teamSize"
            label="Team Size"
            min="1"
            name="teamSize"
            onChange={handleChange}
            required
            type="number"
            value={form.teamSize}
          />
          {renderFieldError('teamSize')}
        </div>
        <div>
          <FloatingField
            error={errors.playerLimit}
            id="playerLimit"
            label="Player Limit"
            min="1"
            name="playerLimit"
            onChange={handleChange}
            required
            type="number"
            value={form.playerLimit}
          />
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
