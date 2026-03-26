import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  createFreeRegistration,
  getMyRegistrationForEvent
} from '../../api/registrationApi.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { saveRegistrationDraft } from '../../utils/paymentDraftStorage.js';
import GoogleLoginButton from '../auth/GoogleLoginButton.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

const emptyPlayer = { name: '', phone: '', address: '' };

const buildInitialState = (event, user) => ({
  eventId: event._id,
  name: event.teamSize === 1 ? user?.name || '' : '',
  teamName: '',
  captainName: '',
  email: user?.email || '',
  phone1: '',
  phone2: '',
  address: '',
  players: []
});

const buildFormFromRegistration = (event, user, registration) => ({
  ...buildInitialState(event, user),
  eventId: registration.eventId?._id || event._id,
  name: registration.name || '',
  teamName: registration.teamName || '',
  captainName: registration.captainName || '',
  email: registration.email || user?.email || '',
  phone1: registration.phone1 || '',
  phone2: registration.phone2 || '',
  address: registration.address || '',
  players: Array.isArray(registration.players) ? registration.players : []
});

const hasPlayerDraftValues = (player) =>
  [player.name, player.phone, player.address].some((value) => value.trim());

const trimPlayer = (player) => ({
  name: player.name.trim(),
  phone: player.phone.trim(),
  address: player.address.trim()
});

const validatePlayerDraft = (player) => {
  const name = player.name.trim();
  const phone = player.phone.trim();
  const address = player.address.trim();

  if (name.length < 2) {
    return 'Player name must be at least 2 characters.';
  }

  if (phone.length < 8) {
    return 'Player phone must be at least 8 characters.';
  }

  if (address.length < 5) {
    return 'Player address must be at least 5 characters.';
  }

  return '';
};

export default function RegistrationForm({ event, onSuccess }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState(() => buildInitialState(event, user));
  const [playerDraft, setPlayerDraft] = useState({ ...emptyPlayer });
  const [editingPlayerIndex, setEditingPlayerIndex] = useState(null);
  const [existingRegistration, setExistingRegistration] = useState(null);
  const [loadingExistingRegistration, setLoadingExistingRegistration] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setForm(buildInitialState(event, user));
    setPlayerDraft({ ...emptyPlayer });
    setEditingPlayerIndex(null);
    setExistingRegistration(null);
    setPlayerError('');
  }, [event, user]);

  useEffect(() => {
    let ignore = false;

    const loadExistingRegistration = async () => {
      if (!isAuthenticated || !event?._id) {
        setExistingRegistration(null);
        setLoadingExistingRegistration(false);
        return;
      }

      setLoadingExistingRegistration(true);

      try {
        const response = await getMyRegistrationForEvent(event._id);

        if (ignore) {
          return;
        }

        setExistingRegistration(response);

        if (response) {
          setForm(buildFormFromRegistration(event, user, response));
          setPlayerDraft({ ...emptyPlayer });
          setEditingPlayerIndex(null);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(getApiErrorMessage(requestError, 'Unable to load your saved registration details.'));
        }
      } finally {
        if (!ignore) {
          setLoadingExistingRegistration(false);
        }
      }
    };

    loadExistingRegistration();

    return () => {
      ignore = true;
    };
  }, [event, isAuthenticated, user]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updatePlayerDraft = (field, value) => {
    setPlayerDraft((current) => ({
      ...current,
      [field]: value
    }));
    setPlayerError('');
  };

  const resetPlayerEditor = () => {
    setPlayerDraft({ ...emptyPlayer });
    setEditingPlayerIndex(null);
    setPlayerError('');
  };

  const savePlayerDraft = () => {
    if (editingPlayerIndex === null && form.players.length >= event.playerLimit) {
      setPlayerError(`Player count cannot exceed ${event.playerLimit}.`);
      return;
    }

    const validationError = validatePlayerDraft(playerDraft);

    if (validationError) {
      setPlayerError(validationError);
      return;
    }

    const nextPlayer = {
      name: playerDraft.name.trim(),
      phone: playerDraft.phone.trim(),
      address: playerDraft.address.trim()
    };

    setForm((current) => ({
      ...current,
      players:
        editingPlayerIndex === null
          ? [...current.players, nextPlayer]
          : current.players.map((player, index) =>
              index === editingPlayerIndex ? nextPlayer : player
            )
    }));

    resetPlayerEditor();
  };

  const handlePlayerEditorKeyDown = (eventValue) => {
    if (eventValue.key !== 'Enter') {
      return;
    }

    eventValue.preventDefault();
    savePlayerDraft();
  };

  const editPlayer = (index) => {
    setPlayerDraft({ ...form.players[index] });
    setEditingPlayerIndex(index);
    setPlayerError('');
    setError('');
  };

  const removePlayer = (index) => {
    setForm((current) => ({
      ...current,
      players: current.players.filter((_, playerIndex) => playerIndex !== index)
    }));

    if (editingPlayerIndex === index) {
      resetPlayerEditor();
      return;
    }

    if (editingPlayerIndex !== null && editingPlayerIndex > index) {
      setEditingPlayerIndex((current) => current - 1);
    }
  };

  const buildRegistrationPayload = (players = form.players) => ({
    ...form,
    players
  });

  const validateRegistration = (players = form.players) => {
    if (event.teamSize === 1 && !form.name.trim()) {
      return 'Participant name is required.';
    }

    if (event.teamSize > 1 && !form.teamName.trim()) {
      return 'Team name is required.';
    }

    if (event.sportType === 'Cricket' && !form.captainName.trim()) {
      return 'Captain name is required for cricket registrations.';
    }

    if (!form.email.trim()) {
      return 'Email is required.';
    }

    if (form.phone1.trim().length < 8) {
      return 'Primary phone must be at least 8 digits.';
    }

    if (form.phone2.trim().length < 8) {
      return 'Secondary phone must be at least 8 digits.';
    }

    if (form.address.trim().length < 5) {
      return 'Address must be at least 5 characters.';
    }

    if (players.length > event.playerLimit) {
      return `Player count cannot exceed ${event.playerLimit}.`;
    }

    return '';
  };

  const handleFreeRegistration = async (registrationPayload) => {
    const response = await createFreeRegistration(registrationPayload);
    setSuccess('Registration saved successfully.');
    setError('');
    onSuccess?.(response);
  };

  const handlePaidRegistration = async (registrationPayload) => {
    saveRegistrationDraft(event._id, registrationPayload);
    setSuccess('Registration details saved. Redirecting to payment methods...');
    setError('');
    navigate(`/events/${event._id}/payment`);
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();

    if (!isAuthenticated) {
      setError('Login is required before you can register.');
      return;
    }

    let playersForSubmission = form.players;
    const draftHasValues = hasPlayerDraftValues(playerDraft);
    const playerDraftValidationError = draftHasValues ? validatePlayerDraft(playerDraft) : '';

    if (draftHasValues && !playerDraftValidationError) {
      const nextPlayer = trimPlayer(playerDraft);

      playersForSubmission =
        editingPlayerIndex === null
          ? [...form.players, nextPlayer]
          : form.players.map((player, index) =>
              index === editingPlayerIndex ? nextPlayer : player
            );

      setForm((current) => ({
        ...current,
        players: playersForSubmission
      }));
      resetPlayerEditor();
    }

    const validationError = validateRegistration(playersForSubmission);

    if (validationError) {
      setError(validationError);
      return;
    }

    const registrationPayload = buildRegistrationPayload(playersForSubmission);

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (Number(event.entryFee) > 0) {
        await handlePaidRegistration(registrationPayload);
        setSubmitting(false);
      } else {
        await handleFreeRegistration(registrationPayload);
        setSubmitting(false);
      }
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Registration failed.'));
      setSubmitting(false);
    }
  };

  return (
    <form className="panel space-y-6 p-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-2xl font-bold">Register for {event.name}</h3>
          <p className="mt-2 text-sm text-slate-500">
            Fill the registration details and {Number(event.entryFee) > 0 ? 'complete payment' : 'confirm your spot'}.
          </p>
        </div>
        <span className="badge bg-brand-mist text-brand-blue">
          {Number(event.entryFee) > 0 ? 'Payment required' : 'Free event'}
        </span>
      </div>

      {!isAuthenticated ? (
        <div className="rounded-2xl border border-dashed border-brand-blue/20 bg-brand-mist/50 p-4">
          <p className="mb-3 text-sm text-slate-600">Use Google sign-in to continue with registration.</p>
          <GoogleLoginButton />
        </div>
      ) : null}

      {loadingExistingRegistration ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <LoadingSpinner compact label="Loading your saved registration details..." />
        </div>
      ) : null}

      {existingRegistration ? (
        <p className="rounded-2xl bg-brand-mist px-4 py-3 text-sm text-brand-blue">
          A registration already exists for this event using your signed-in email. The saved player list and registration details are shown below.
        </p>
      ) : null}

      <fieldset className="space-y-6 border-0 p-0" disabled={Boolean(existingRegistration)}>
        {event.teamSize === 1 ? (
          <div>
            <label className="label" htmlFor="name">
              Participant Name
            </label>
            <input className="input" id="name" onChange={(e) => updateField('name', e.target.value)} required value={form.name} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="teamName">
                Team Name
              </label>
              <input className="input" id="teamName" onChange={(e) => updateField('teamName', e.target.value)} required value={form.teamName} />
            </div>
            {event.sportType === 'Cricket' ? (
              <div>
                <label className="label" htmlFor="captainName">
                  Captain Name
                </label>
                <input className="input" id="captainName" onChange={(e) => updateField('captainName', e.target.value)} required value={form.captainName} />
              </div>
            ) : null}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input className="input" id="email" onChange={(e) => updateField('email', e.target.value)} required type="email" value={form.email} />
          </div>
          <div>
            <label className="label" htmlFor="phone1">
              Primary Phone
            </label>
            <input className="input" id="phone1" onChange={(e) => updateField('phone1', e.target.value)} required value={form.phone1} />
          </div>
          <div>
            <label className="label" htmlFor="phone2">
              Secondary Phone
            </label>
            <input className="input" id="phone2" onChange={(e) => updateField('phone2', e.target.value)} required value={form.phone2} />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="address">
              Address
            </label>
            <textarea
              className="input min-h-24"
              id="address"
              onChange={(e) => updateField('address', e.target.value)}
              required
              value={form.address}
            />
          </div>
        </div>

        {event.sportType === 'Cricket' ? (
          <div className="space-y-4 rounded-3xl bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-950">Player List</h4>
              <p className="text-sm text-slate-500">
                Add up to {event.playerLimit} players now. You can keep the roster partial and update it later.
              </p>
            </div>
            <span className="badge bg-brand-mist text-brand-blue">
              {form.players.length}/{event.playerLimit} players added
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h5 className="text-sm font-semibold text-slate-800">
                {editingPlayerIndex === null ? 'Add Player' : `Edit Player ${editingPlayerIndex + 1}`}
              </h5>
              {editingPlayerIndex === null ? (
                <button
                  className="btn-secondary px-4 py-2"
                  disabled={form.players.length >= event.playerLimit}
                  onClick={savePlayerDraft}
                  type="button"
                >
                  Add Player
                </button>
              ) : (
                <div className="flex gap-2">
                  <button className="btn-secondary px-4 py-2" onClick={resetPlayerEditor} type="button">
                    Cancel
                  </button>
                  <button className="btn-primary px-4 py-2" onClick={savePlayerDraft} type="button">
                    Update
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="input"
                onChange={(eventValue) => updatePlayerDraft('name', eventValue.target.value)}
                onKeyDown={handlePlayerEditorKeyDown}
                placeholder="Player name"
                value={playerDraft.name}
              />
              <input
                className="input"
                onChange={(eventValue) => updatePlayerDraft('phone', eventValue.target.value)}
                onKeyDown={handlePlayerEditorKeyDown}
                placeholder="Phone"
                value={playerDraft.phone}
              />
              <input
                className="input md:col-span-2"
                onChange={(eventValue) => updatePlayerDraft('address', eventValue.target.value)}
                onKeyDown={handlePlayerEditorKeyDown}
                placeholder="Address"
                value={playerDraft.address}
              />
            </div>

            {playerError ? (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {playerError}
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Only saved rows from the table are used for registration. You can leave draft changes here and save or edit them later.
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Player Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {form.players.length ? (
                  form.players.map((player, index) => (
                    <tr className="border-t border-slate-100" key={`${player.name}-${player.phone}-${index}`}>
                      <td className="px-4 py-4 font-semibold text-slate-900">{index + 1}</td>
                      <td className="px-4 py-4 text-slate-700">{player.name}</td>
                      <td className="px-4 py-4 text-slate-700">{player.phone}</td>
                      <td className="px-4 py-4 text-slate-700">{player.address}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn-secondary px-4 py-2"
                            onClick={() => editPlayer(index)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="btn-primary px-4 py-2"
                            onClick={() => removePlayer(index)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan="5">
                      No players added yet. Add players one by one to build the team list.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        ) : null}

        <button className="btn-primary" disabled={submitting || Boolean(existingRegistration)} type="submit">
          {existingRegistration
            ? 'Already Registered'
            : submitting
              ? 'Processing...'
              : Number(event.entryFee) > 0
                ? 'Continue to Payment'
                : 'Confirm Registration'}
        </button>
      </fieldset>

      {existingRegistration?.paymentId?.status ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Current payment status: <span className="font-semibold">{existingRegistration.paymentId.status}</span>
        </p>
      ) : null}

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}
    </form>
  );
}
