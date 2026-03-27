import { useEffect, useState } from 'react';

import {
  createMatch,
  generateKnockoutBracket,
  getAdminMatchesByEvent,
  getConfirmedTeamsByEvent,
} from '../../api/dashboardApi.js';
import { getAdminEvents } from '../../api/eventsApi.js';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import TypeaheadSelect from '../../components/common/TypeaheadSelect.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatDateTime } from '../../utils/formatters.js';

const initialForm = {
  eventId: '',
  teamA: '',
  teamB: '',
  date: '',
  time: '',
  venue: ''
};

export default function AdminMatchesPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [confirmedTeams, setConfirmedTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [bracketConfig, setBracketConfig] = useState({ date: '', time: '', venue: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(false);
  const eventOptions = [
    { value: '', label: 'Select Event' },
    ...events.map((event) => ({
      value: event._id,
      label: event.name
    }))
  ];
  const teamOptions = [
    { value: '', label: 'Select Team' },
    ...confirmedTeams.map((team) => ({
      value: team.teamName,
      label: team.teamName
    }))
  ];

  const refreshEventContext = async (eventId) => {
    if (!eventId) {
      setMatches([]);
      setConfirmedTeams([]);
      return;
    }

    setContextLoading(true);

    try {
      const [matchesResponse, teamsResponse] = await Promise.all([
        getAdminMatchesByEvent(eventId),
        getConfirmedTeamsByEvent(eventId)
      ]);

      setMatches(matchesResponse);
      setConfirmedTeams(teamsResponse);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load schedule data.'));
    } finally {
      setContextLoading(false);
    }
  };

  useEffect(() => {
    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const response = await getAdminEvents();
        setEvents(response);

        if (response[0]?._id) {
          setSelectedEventId(response[0]._id);
          setForm((current) => ({ ...current, eventId: response[0]._id, venue: response[0].venue || '' }));
          setBracketConfig((current) => ({ ...current, venue: response[0].venue || '' }));
        }
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load events for scheduling.'));
      } finally {
        setEventsLoading(false);
      }
    };

    loadEvents();
  }, []);

  useEffect(() => {
    refreshEventContext(selectedEventId);
  }, [selectedEventId]);

  const handleEventChange = (eventValue) => {
    const nextEventId = eventValue.target.value;
    const selected = events.find((item) => item._id === nextEventId);

    setSelectedEventId(nextEventId);
    setForm((current) => ({
      ...current,
      eventId: nextEventId,
      teamA: '',
      teamB: '',
      venue: selected?.venue || ''
    }));
    setBracketConfig((current) => ({
      ...current,
      venue: selected?.venue || ''
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.eventId) {
      setError('Select an event before creating a match.');
      return;
    }

    if (!form.teamA || !form.teamB) {
      setError('Select both confirmed teams.');
      return;
    }

    if (form.teamA === form.teamB) {
      setError('Team A and Team B must be different.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createMatch(form);
      setForm((current) => ({ ...current, teamA: '', teamB: '' }));
      setSuccess('Match created successfully.');
      await refreshEventContext(selectedEventId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to save the match.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (!selectedEventId) {
      setError('Select an event before generating the bracket.');
      return;
    }

    if (confirmedTeams.length < 2) {
      setError('At least two confirmed teams are required to generate a knockout bracket.');
      return;
    }

    if (!bracketConfig.date || !bracketConfig.time) {
      setError('Select a base date and time for the first knockout round.');
      return;
    }

    let replaceExisting = false;

    if (matches.length) {
      replaceExisting = window.confirm('Matches already exist for this event. Replace the current bracket?');

      if (!replaceExisting) {
        return;
      }
    }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      await generateKnockoutBracket({
        eventId: selectedEventId,
        date: bracketConfig.date,
        time: bracketConfig.time,
        venue: bracketConfig.venue,
        replaceExisting
      });
      setSuccess('Knockout bracket generated successfully.');
      await refreshEventContext(selectedEventId);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to generate the knockout bracket.'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminPageShell
      description="Only confirmed teams can enter the knockout draw. Build fixtures manually or generate a bracket from the confirmed registrations."
      title="Schedule Management"
    >
      <div className="space-y-8">
        <div className="panel space-y-4 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Event Schedule Controls</h2>
              <p className="mt-2 text-sm text-slate-500">
                Select an event to load confirmed teams and its current knockout fixtures.
              </p>
            </div>
            <TypeaheadSelect
              className="max-w-sm"
              disabled={eventsLoading}
              onChange={handleEventChange}
              options={eventOptions}
              placeholder="Select event"
              searchPlaceholder="Search events"
              value={selectedEventId}
            />
          </div>

          <FormAlert message={error} />
          <FormAlert message={success} type="success" />
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-8">
            <section className="panel p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Confirmed Teams</h2>
                  <p className="mt-2 text-sm text-slate-500">Only these teams can be scheduled.</p>
                </div>
                <span className="badge bg-brand-mist text-brand-blue">{confirmedTeams.length} teams</span>
              </div>

              <div className="mt-6 space-y-3">
                {eventsLoading || contextLoading ? (
                  <LoadingSpinner compact label="Loading confirmed teams..." />
                ) : confirmedTeams.length ? (
                  confirmedTeams.map((team) => (
                    <div className="rounded-2xl bg-slate-50 px-4 py-4" key={team.registrationId}>
                      <p className="font-semibold text-slate-950">{team.teamName}</p>
                      <p className="mt-1 text-sm text-slate-500">Captain: {team.captainName || 'Not provided'}</p>
                      <p className="mt-1 text-sm text-slate-500">Players: {team.playerCount}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No confirmed teams found for the selected event.
                  </p>
                )}
              </div>
            </section>

            <form className="panel space-y-4 p-6" onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold">Create Manual Match</h2>
              <TypeaheadSelect
                onChange={(event) =>
                  setForm((current) => ({ ...current, teamA: event.target.value }))
                }
                options={teamOptions}
                placeholder="Select Team A"
                searchPlaceholder="Search teams"
                value={form.teamA}
              />
              <TypeaheadSelect
                onChange={(event) =>
                  setForm((current) => ({ ...current, teamB: event.target.value }))
                }
                options={teamOptions}
                placeholder="Select Team B"
                searchPlaceholder="Search teams"
                value={form.teamB}
              />
              <input className="input" onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required type="date" value={form.date} />
              <input className="input" onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} required type="time" value={form.time} />
              <input className="input" onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))} placeholder="Venue" required value={form.venue} />
              <button className="btn-primary" disabled={submitting || confirmedTeams.length < 2} type="submit">
                {submitting ? 'Saving...' : 'Save Match'}
              </button>
            </form>

            <section className="panel space-y-4 p-6">
              <div>
                <h2 className="text-2xl font-bold">Generate Knockout Bracket</h2>
                <p className="mt-2 text-sm text-slate-500">
                  This creates the initial confirmed-team pairings and the future winner-vs-winner rounds until the final.
                </p>
              </div>

              <input className="input" onChange={(event) => setBracketConfig((current) => ({ ...current, date: event.target.value }))} type="date" value={bracketConfig.date} />
              <input className="input" onChange={(event) => setBracketConfig((current) => ({ ...current, time: event.target.value }))} type="time" value={bracketConfig.time} />
              <input className="input" onChange={(event) => setBracketConfig((current) => ({ ...current, venue: event.target.value }))} placeholder="Venue for first round" value={bracketConfig.venue} />
              <button className="btn-primary" disabled={generating || confirmedTeams.length < 2} onClick={handleGenerateBracket} type="button">
                {generating ? 'Generating...' : 'Generate Knockout'}
              </button>
            </section>
          </div>

          <section className="panel p-6">
            <h2 className="text-2xl font-bold">Published Matches</h2>
            <div className="mt-6 space-y-4">
              {eventsLoading || contextLoading ? (
                <LoadingSpinner compact label="Loading match schedule..." />
              ) : matches.length ? (
                matches.map((match) => (
                  <article className="rounded-3xl bg-slate-50 p-5" key={match._id}>
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">{match.roundLabel || 'Knockout Match'}</p>
                        <p className="mt-2 text-xl font-bold text-slate-950">
                          {match.teamA} vs {match.teamB}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">{match.venue || 'Venue pending'}</p>
                        {match.winnerTeam ? (
                          <p className="mt-2 text-sm text-emerald-700">Auto advanced: {match.winnerTeam}</p>
                        ) : null}
                      </div>
                      <div className="text-sm text-slate-500">
                        <p>{match.scheduledAt ? formatDateTime(match.scheduledAt) : 'Schedule pending'}</p>
                        <p className="mt-1">Status: {match.status}</p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">No matches created for the selected event.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminPageShell>
  );
}
