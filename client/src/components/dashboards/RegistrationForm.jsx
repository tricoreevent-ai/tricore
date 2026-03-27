import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  createFreeRegistration,
  getMyRegistrationForEvent,
  updateMyRegistration
} from '../../api/registrationApi.js';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { saveRegistrationDraft } from '../../utils/paymentDraftStorage.js';
import GoogleLoginButton from '../auth/GoogleLoginButton.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import FloatingLabelField from '../common/FloatingLabelField.jsx';

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
  email: user?.email || registration.email || '',
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
        setError('');

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
    email: user?.email || form.email,
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
    setExistingRegistration(response.registration);
    setForm(buildFormFromRegistration(event, user, response.registration));
    setSuccess('Registration saved successfully.');
    setError('');
    onSuccess?.(response.registration);
  };

  const handlePaidRegistration = async (registrationPayload) => {
    saveRegistrationDraft(event._id, registrationPayload);
    setSuccess('Registration details saved. Redirecting to payment methods...');
    setError('');
    navigate(`/events/${event._id}/payment`);
  };

  const handleRegistrationUpdate = async (registrationPayload) => {
    const response = await updateMyRegistration(existingRegistration._id, registrationPayload);
    setExistingRegistration(response);
    setForm(buildFormFromRegistration(event, user, response));
    setSuccess('Registration updated successfully.');
    setError('');
    onSuccess?.(response);
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

    if (draftHasValues && playerDraftValidationError) {
      setPlayerError(playerDraftValidationError);
      setError('Please save or fix the player currently being edited before continuing.');
      return;
    }

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
      if (existingRegistration) {
        await handleRegistrationUpdate(registrationPayload);
        setSubmitting(false);
      } else if (Number(event.entryFee) > 0) {
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
    <form className="panel space-y-5 p-4 sm:p-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-950">
            {existingRegistration ? 'Update Registration' : `Register for ${event.name}`}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {existingRegistration
              ? 'Add more players, revise the roster, or update your contact details without creating a second registration.'
              : `Fill the registration details and ${Number(event.entryFee) > 0 ? 'complete payment' : 'confirm your spot'}.`}
          </p>
        </div>
        <span className="badge bg-brand-mist text-brand-blue">
          {existingRegistration
            ? 'Already registered'
            : Number(event.entryFee) > 0
              ? 'Payment required'
              : 'Free event'}
        </span>
      </div>

      {!isAuthenticated ? (
        <div className="rounded-2xl border border-dashed border-brand-blue/20 bg-brand-mist/50 p-4">
          <p className="mb-3 text-sm text-slate-600">Use Google sign-in to continue with registration.</p>
          <GoogleLoginButton />
        </div>
      ) : null}

      {isAuthenticated ? (
        <div className="rounded-[1.75rem] border border-brand-blue/10 bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
            Signed in with Google
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-950">
                {user?.name || 'TriCore user'}
              </p>
              <p className="truncate text-sm text-slate-600">{user?.email}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-soft">
              This registration will stay linked to your Google account.
            </div>
          </div>
        </div>
      ) : null}

      {loadingExistingRegistration ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <LoadingSpinner compact label="Loading your saved registration details..." />
        </div>
      ) : null}

      {existingRegistration ? (
        <p className="rounded-2xl bg-brand-mist px-4 py-3 text-sm text-brand-blue">
          A registration already exists for this event. You can add more players or refresh the saved contact details below.
        </p>
      ) : null}

      <fieldset className="space-y-5 border-0 p-0">
        {event.teamSize === 1 ? (
          <FloatingLabelField
            id="name"
            label="Participant Name"
            onChange={(eventValue) => updateField('name', eventValue.target.value)}
            required
            value={form.name}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <FloatingLabelField
              id="teamName"
              label="Team Name"
              onChange={(eventValue) => updateField('teamName', eventValue.target.value)}
              required
              value={form.teamName}
            />
            {event.sportType === 'Cricket' ? (
              <FloatingLabelField
                id="captainName"
                label="Captain Name"
                onChange={(eventValue) => updateField('captainName', eventValue.target.value)}
                required
                value={form.captainName}
              />
            ) : null}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FloatingLabelField
            id="email"
            helper="This stays synced with your signed-in Google account."
            label="Google Account Email"
            required
            readOnly
            type="email"
            value={user?.email || form.email}
          />
          <FloatingLabelField
            id="phone1"
            label="Primary Phone"
            onChange={(eventValue) => updateField('phone1', eventValue.target.value)}
            required
            value={form.phone1}
          />
          <FloatingLabelField
            id="phone2"
            label="Secondary Phone"
            onChange={(eventValue) => updateField('phone2', eventValue.target.value)}
            required
            value={form.phone2}
          />
          <div className="md:col-span-2">
            <FloatingLabelField
              id="address"
              label="Address"
              onChange={(eventValue) => updateField('address', eventValue.target.value)}
              required
              textarea
              value={form.address}
            />
          </div>
        </div>

        {event.teamSize > 1 ? (
          <div className="space-y-4 rounded-3xl bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-950">Player List</h4>
                <p className="text-sm text-slate-500">
                  Add up to {event.playerLimit} players now. You can keep the roster partial and update it later.
                </p>
              </div>
              <span className="badge w-fit bg-brand-mist text-brand-blue">
                {form.players.length}/{event.playerLimit} players added
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h5 className="text-sm font-semibold text-slate-800">
                  {editingPlayerIndex === null ? 'Add Player' : `Edit Player ${editingPlayerIndex + 1}`}
                </h5>
                {editingPlayerIndex === null ? (
                  <button
                    className="btn-secondary w-full px-4 py-2 sm:w-auto"
                    disabled={form.players.length >= event.playerLimit}
                    onClick={savePlayerDraft}
                    type="button"
                  >
                    Add Player
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button className="btn-secondary w-full px-4 py-2 sm:w-auto" onClick={resetPlayerEditor} type="button">
                      Cancel
                    </button>
                    <button className="btn-primary w-full px-4 py-2 sm:w-auto" onClick={savePlayerDraft} type="button">
                      Update
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div onKeyDown={handlePlayerEditorKeyDown}>
                  <FloatingLabelField
                    id="player-draft-name"
                    label="Player Name"
                    onChange={(eventValue) => updatePlayerDraft('name', eventValue.target.value)}
                    value={playerDraft.name}
                  />
                </div>
                <div onKeyDown={handlePlayerEditorKeyDown}>
                  <FloatingLabelField
                    id="player-draft-phone"
                    label="Phone"
                    onChange={(eventValue) => updatePlayerDraft('phone', eventValue.target.value)}
                    value={playerDraft.phone}
                  />
                </div>
                <div className="md:col-span-2" onKeyDown={handlePlayerEditorKeyDown}>
                  <FloatingLabelField
                    id="player-draft-address"
                    label="Address"
                    onChange={(eventValue) => updatePlayerDraft('address', eventValue.target.value)}
                    value={playerDraft.address}
                  />
                </div>
              </div>

              {playerError ? (
                <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {playerError}
                </p>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  Only saved players below are submitted. Save the draft row before updating the registration.
                </p>
              )}
            </div>

            {form.players.length ? (
              <>
                <div className="space-y-3 md:hidden">
                  {form.players.map((player, index) => (
                    <div
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                      key={`${player.name}-${player.phone}-${index}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Player {index + 1}
                          </p>
                          <p className="mt-2 text-base font-bold text-slate-950">{player.name}</p>
                        </div>
                        <span className="badge bg-slate-100 text-slate-700">Saved</span>
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <p><span className="font-semibold text-slate-900">Phone:</span> {player.phone}</p>
                        <p><span className="font-semibold text-slate-900">Address:</span> {player.address}</p>
                      </div>
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          className="btn-secondary w-full px-4 py-2"
                          onClick={() => editPlayer(index)}
                          type="button"
                        >
                          Edit Player
                        </button>
                        <button
                          className="btn-primary w-full px-4 py-2"
                          onClick={() => removePlayer(index)}
                          type="button"
                        >
                          Remove Player
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
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
                      {form.players.map((player, index) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                No players added yet. Add players one by one to build the team list.
              </div>
            )}
          </div>
        ) : null}

        <button className="btn-primary w-full sm:w-auto" disabled={submitting} type="submit">
          {submitting
            ? existingRegistration
              ? 'Updating...'
              : 'Processing...'
            : existingRegistration
              ? 'Update Registration'
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
