import { useEffect, useMemo, useState } from 'react';

import {
  approveExperimentalFixturePlan,
  autoGenerateFixtures,
  createMatch,
  generateExperimentalFixturePlan,
  getAdminMatchesByEvent,
  getConfirmedTeamsByEvent,
  getExperimentalFixturePlan,
  getMatchConfiguration,
  rejectExperimentalFixturePlan,
  saveExperimentalFixturePlanDraft,
  saveMatchConfiguration,
  updateMatch
} from '../../api/dashboardApi.js';
import { getAdminEvents } from '../../api/eventsApi.js';
import AppIcon from '../../components/common/AppIcon.jsx';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ExperimentalFixtureLab from '../../components/matches/ExperimentalFixtureLab.jsx';
import FixtureTreePanel from '../../components/matches/FixtureTreePanel.jsx';
import TypeaheadSelect from '../../components/common/TypeaheadSelect.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatDate, formatDateTime } from '../../utils/formatters.js';
import {
  buildFixtureAiRequestPayload,
  computeMatchStandings,
  createEditableMatchDraft,
  createInitialFixtureAiForm,
  createInitialFixtureAiPlan,
  createInitialFixtureBatchForm,
  createInitialMatchConfiguration,
  createInitialMatchForm,
  getMatchFormatOptions,
  groupMatchesByCalendarDate,
  sortMatchesBySchedule
} from '../../utils/matchAdmin.js';

const matchWorkspaceTabs = [
  { key: 'configuration', label: 'Match Configuration', icon: 'settings' },
  { key: 'fixtures', label: 'Fixture Management', icon: 'calendar' },
  { key: 'planner', label: 'Fixture Planner', icon: 'matches' },
  { key: 'aiLab', label: 'AI Fixture Lab', icon: 'sparkle' },
  { key: 'points', label: 'Points System', icon: 'chart' },
  { key: 'teams', label: 'Team Registration', icon: 'users' },
  { key: 'players', label: 'Player Management', icon: 'userPlus' },
  { key: 'results', label: 'Match Results Entry', icon: 'edit' },
  { key: 'standings', label: 'Standings and Rankings', icon: 'trendUp' },
  { key: 'knockout', label: 'Knockout and Finals Setup', icon: 'trophy' },
  { key: 'notifications', label: 'Notifications and Alerts', icon: 'bell' },
  { key: 'calendar', label: 'Calendar View', icon: 'calendar' }
];

const matchTypeOptions = [
  { value: 'League', label: 'League Match' },
  { value: 'Group Stage', label: 'Group Stage' },
  { value: 'Quarterfinal', label: 'Quarterfinal' },
  { value: 'Semifinal', label: 'Semifinal' },
  { value: 'Final', label: 'Final' },
  { value: 'Third Place', label: 'Third Place' },
  { value: 'Knockout', label: 'Knockout' }
];

const matchStatusOptions = [
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Postponed', label: 'Postponed' },
  { value: 'Abandoned', label: 'Abandoned' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Bye', label: 'Bye' }
];

const officialRoleOptions = [
  { value: 'Umpire', label: 'Umpire' },
  { value: 'Referee', label: 'Referee' },
  { value: 'Scorer', label: 'Scorer' },
  { value: 'Match Officer', label: 'Match Officer' }
];

const getMatchTypeBadgeClass = (matchType) => {
  const normalizedMatchType = String(matchType || '').trim().toLowerCase();

  if (normalizedMatchType === 'group stage' || normalizedMatchType === 'league') {
    return 'bg-sky-50 text-sky-700';
  }

  if (normalizedMatchType === 'quarterfinal' || normalizedMatchType === 'semifinal') {
    return 'bg-violet-50 text-violet-700';
  }

  if (normalizedMatchType === 'final' || normalizedMatchType === 'third place') {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-slate-100 text-slate-700';
};

const getMatchStatusBadgeClass = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'completed') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (normalizedStatus === 'scheduled') {
    return 'bg-blue-50 text-blue-700';
  }

  if (normalizedStatus === 'postponed' || normalizedStatus === 'abandoned') {
    return 'bg-amber-50 text-amber-700';
  }

  if (normalizedStatus === 'cancelled') {
    return 'bg-red-50 text-red-700';
  }

  return 'bg-slate-100 text-slate-700';
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsDataURL(file);
  });

function WorkspaceTabButton({ active, icon, label, onClick }) {
  return (
    <button
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
        active
          ? 'bg-brand-blue text-white shadow-[0_18px_40px_rgba(37,99,235,0.2)]'
          : 'bg-white text-slate-700 hover:bg-brand-mist'
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          active ? 'bg-white/15' : 'bg-slate-100'
        }`}
      >
        <AppIcon className="h-4 w-4" name={icon} />
      </span>
      <span>{label}</span>
    </button>
  );
}

function SectionIntro({ title, description, action = null }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default function AdminMatchesPage() {
  const [activeTab, setActiveTab] = useState('configuration');
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [confirmedTeams, setConfirmedTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [configuration, setConfiguration] = useState(createInitialMatchConfiguration());
  const [form, setForm] = useState(createInitialMatchForm());
  const [fixtureBatch, setFixtureBatch] = useState(createInitialFixtureBatchForm());
  const [fixtureAiPlan, setFixtureAiPlan] = useState(createInitialFixtureAiPlan());
  const [fixtureAiForm, setFixtureAiForm] = useState(createInitialFixtureAiForm());
  const [editableMatch, setEditableMatch] = useState(createEditableMatchDraft());
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [selectedTeamProfileId, setSelectedTeamProfileId] = useState('');
  const [calendarTeamFilter, setCalendarTeamFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [eventsLoading, setEventsLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [fixtureAiGenerating, setFixtureAiGenerating] = useState(false);
  const [fixtureAiSaving, setFixtureAiSaving] = useState(false);
  const [fixtureAiApproving, setFixtureAiApproving] = useState(false);
  const [fixtureAiRejecting, setFixtureAiRejecting] = useState(false);
  const [updatingMatchRecord, setUpdatingMatchRecord] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event._id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const syncFixtureAiState = (planResponse, eventRecord, configurationRecord) => {
    const nextPlan = createInitialFixtureAiPlan(planResponse);
    setFixtureAiPlan(nextPlan);
    setFixtureAiForm(createInitialFixtureAiForm(eventRecord, configurationRecord, nextPlan));
  };

  const eventOptions = useMemo(
    () => [
      { value: '', label: 'Select Event' },
      ...events.map((event) => ({ value: event._id, label: event.name }))
    ],
    [events]
  );

  const teamOptions = useMemo(
    () => [
      { value: '', label: 'Select Team' },
      ...confirmedTeams.map((team) => ({ value: team.teamName, label: team.teamName }))
    ],
    [confirmedTeams]
  );

  const sortedMatches = useMemo(() => sortMatchesBySchedule(matches), [matches]);

  const matchOptions = useMemo(
    () => [
      { value: '', label: 'Select Match' },
      ...sortedMatches.map((match) => ({
        value: match._id,
        label: `${match.teamA} vs ${match.teamB}${match.roundLabel ? ` - ${match.roundLabel}` : ''}`
      }))
    ],
    [sortedMatches]
  );

  const teamProfileOptions = useMemo(
    () => [
      { value: '', label: 'Select Team' },
      ...configuration.teamProfiles.map((profile) => ({
        value: profile.id || profile.registrationId || profile.teamName,
        label: profile.teamName
      }))
    ],
    [configuration.teamProfiles]
  );

  const matchFormatOptions = useMemo(
    () => getMatchFormatOptions(configuration.sportType || selectedEvent?.sportType),
    [configuration.sportType, selectedEvent]
  );

  const selectedTeamProfile = useMemo(() => {
    const fallbackTeamProfile = configuration.teamProfiles[0] || null;
    return (
      configuration.teamProfiles.find(
        (profile) =>
          (profile.id || profile.registrationId || profile.teamName) === selectedTeamProfileId
      ) || fallbackTeamProfile
    );
  }, [configuration.teamProfiles, selectedTeamProfileId]);

  const selectedMatch = useMemo(() => {
    const fallbackMatch = sortedMatches[0] || null;
    return sortedMatches.find((match) => match._id === selectedMatchId) || fallbackMatch;
  }, [selectedMatchId, sortedMatches]);

  const standings = useMemo(
    () =>
      computeMatchStandings({
        matches,
        teams: configuration.teamProfiles.length ? configuration.teamProfiles : confirmedTeams,
        configuration,
        sportType: configuration.sportType || selectedEvent?.sportType
      }),
    [configuration, confirmedTeams, matches, selectedEvent]
  );

  const filteredCalendarMatches = useMemo(
    () =>
      calendarTeamFilter
        ? matches.filter(
            (match) => match.teamA === calendarTeamFilter || match.teamB === calendarTeamFilter
          )
        : matches,
    [calendarTeamFilter, matches]
  );

  const calendarGroups = useMemo(
    () => groupMatchesByCalendarDate(filteredCalendarMatches),
    [filteredCalendarMatches]
  );

  const matchSummary = useMemo(
    () => ({
      completed: matches.filter((match) => match.status === 'Completed').length,
      scheduled: matches.filter((match) => match.status === 'Scheduled').length,
      postponed: matches.filter((match) =>
        ['Postponed', 'Cancelled', 'Abandoned'].includes(match.status)
      ).length
    }),
    [matches]
  );

  useEffect(() => {
    const loadEvents = async () => {
      setEventsLoading(true);

      try {
        const response = await getAdminEvents();
        setEvents(Array.isArray(response) ? response : []);

        if (response?.[0]?._id) {
          setSelectedEventId(response[0]._id);
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
    if (!selectedEventId || !selectedEvent) {
      return;
    }

    const loadWorkspace = async () => {
      setContextLoading(true);

      try {
        const [configurationResponse, matchesResponse, teamsResponse, fixtureAiPlanResponse] =
          await Promise.all([
          getMatchConfiguration(selectedEventId),
          getAdminMatchesByEvent(selectedEventId),
          getConfirmedTeamsByEvent(selectedEventId),
          getExperimentalFixturePlan(selectedEventId)
        ]);

        const nextConfiguration = createInitialMatchConfiguration(
          configurationResponse,
          selectedEvent
        );
        const nextVenue =
          nextConfiguration.finalMatch?.venue || selectedEvent.venue || fixtureBatch.venue || '';

        setConfiguration(nextConfiguration);
        setMatches(Array.isArray(matchesResponse) ? matchesResponse : []);
        setConfirmedTeams(Array.isArray(teamsResponse) ? teamsResponse : []);
        setForm(createInitialMatchForm(selectedEventId, nextVenue));
        setFixtureBatch(createInitialFixtureBatchForm(nextVenue));
        syncFixtureAiState(fixtureAiPlanResponse, selectedEvent, nextConfiguration);
        setError('');
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load the match workspace.'));
      } finally {
        setContextLoading(false);
      }
    };

    loadWorkspace();
  }, [selectedEvent, selectedEventId]);

  useEffect(() => {
    if (!selectedMatch) {
      setEditableMatch(createEditableMatchDraft());
      setSelectedMatchId('');
      return;
    }

    setEditableMatch(createEditableMatchDraft(selectedMatch));
    setSelectedMatchId(selectedMatch._id);
  }, [selectedMatch]);

  useEffect(() => {
    if (!selectedTeamProfile) {
      setSelectedTeamProfileId('');
      return;
    }

    setSelectedTeamProfileId(
      selectedTeamProfile.id || selectedTeamProfile.registrationId || selectedTeamProfile.teamName
    );
  }, [selectedTeamProfile]);

  const refreshWorkspace = async () => {
    if (!selectedEventId) {
      return;
    }

    const [configurationResponse, matchesResponse, teamsResponse, fixtureAiPlanResponse] =
      await Promise.all([
      getMatchConfiguration(selectedEventId),
      getAdminMatchesByEvent(selectedEventId),
      getConfirmedTeamsByEvent(selectedEventId),
      getExperimentalFixturePlan(selectedEventId)
    ]);

    const nextConfiguration = createInitialMatchConfiguration(configurationResponse, selectedEvent);

    setConfiguration(nextConfiguration);
    setMatches(Array.isArray(matchesResponse) ? matchesResponse : []);
    setConfirmedTeams(Array.isArray(teamsResponse) ? teamsResponse : []);
    syncFixtureAiState(fixtureAiPlanResponse, selectedEvent, nextConfiguration);
  };

  const handleEventChange = (eventValue) => {
    setSelectedEventId(eventValue.target.value);
    setSelectedMatchId('');
    setSelectedTeamProfileId('');
    setCalendarTeamFilter('');
    setFixtureAiPlan(createInitialFixtureAiPlan());
    setFixtureAiForm(createInitialFixtureAiForm());
    setError('');
    setSuccess('');
  };

  const updateConfigurationField = (field, value) => {
    setConfiguration((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updatePairingField = (pairingKey, pairingId, field, value) => {
    setConfiguration((current) => ({
      ...current,
      [pairingKey]: current[pairingKey].map((pairing) =>
        pairing.id === pairingId ? { ...pairing, [field]: value } : pairing
      )
    }));
  };

  const updateNestedMatchField = (fieldKey, field, value) => {
    setConfiguration((current) => ({
      ...current,
      [fieldKey]: {
        ...(current[fieldKey] || {}),
        [field]: value
      }
    }));
  };

  const updateTeamProfileField = (teamProfileId, field, value) => {
    setConfiguration((current) => ({
      ...current,
      teamProfiles: current.teamProfiles.map((profile) =>
        (profile.id || profile.registrationId || profile.teamName) === teamProfileId
          ? { ...profile, [field]: value }
          : profile
      )
    }));
  };

  const updatePlayerField = (teamProfileId, playerId, field, value) => {
    setConfiguration((current) => ({
      ...current,
      teamProfiles: current.teamProfiles.map((profile) =>
        (profile.id || profile.registrationId || profile.teamName) === teamProfileId
          ? {
              ...profile,
              players: (profile.players || []).map((player) =>
                player.id === playerId ? { ...player, [field]: value } : player
              )
            }
          : profile
      )
    }));
  };

  const handleTeamLogoUpload = async (teamProfileId, file) => {
    if (!file) {
      return;
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      updateTeamProfileField(teamProfileId, 'teamLogoUrl', imageDataUrl);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to read the team logo.'));
    }
  };

  const handlePlayerPhotoUpload = async (teamProfileId, playerId, file) => {
    if (!file) {
      return;
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      updatePlayerField(teamProfileId, playerId, 'photoUrl', imageDataUrl);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to read the player photo.'));
    }
  };

  const handleSaveConfiguration = async (message = 'Match configuration updated successfully.') => {
    if (!selectedEventId) {
      setError('Select an event before saving match configuration.');
      return;
    }

    setConfigSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await saveMatchConfiguration(selectedEventId, configuration);
      setConfiguration(createInitialMatchConfiguration(response, selectedEvent));
      setSuccess(message);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to save the match configuration.'));
    } finally {
      setConfigSaving(false);
    }
  };

  const handleCreateMatch = async (event) => {
    event.preventDefault();

    if (!form.eventId) {
      setError('Select an event before creating a match.');
      return;
    }

    if (!form.teamA || !form.teamB || form.teamA === form.teamB) {
      setError('Select two different teams before saving the fixture.');
      return;
    }

    setCreatingMatch(true);
    setError('');
    setSuccess('');

    try {
      await createMatch(form);
      await refreshWorkspace();
      setForm(createInitialMatchForm(selectedEventId, form.venue));
      setSuccess('Manual fixture created successfully.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to save the fixture.'));
    } finally {
      setCreatingMatch(false);
    }
  };

  const handleAutoGenerateFixtures = async () => {
    if (!selectedEventId) {
      setError('Select an event before generating fixtures.');
      return;
    }

    if (!fixtureBatch.date || !fixtureBatch.time) {
      setError('Choose a base date and time before generating fixtures.');
      return;
    }

    let replaceExisting = false;

    if (matches.length) {
      replaceExisting = window.confirm(
        'Fixtures already exist for this event. Replace the existing schedule with a fresh auto-generated set?'
      );

      if (!replaceExisting) {
        return;
      }
    }

    setAutoGenerating(true);
    setError('');
    setSuccess('');

    try {
      await autoGenerateFixtures({
        eventId: selectedEventId,
        date: fixtureBatch.date,
        time: fixtureBatch.time,
        venue: fixtureBatch.venue,
        replaceExisting
      });
      await refreshWorkspace();
      setSuccess('Fixtures generated successfully from the saved match configuration.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to auto-generate fixtures.'));
    } finally {
      setAutoGenerating(false);
    }
  };

  const buildFixtureAiDraftPayload = () => ({
    optimizationScore: fixtureAiPlan.optimizationScore,
    inputs: buildFixtureAiRequestPayload(fixtureAiForm),
    groupSuggestions: fixtureAiPlan.groupSuggestions,
    fixtures: fixtureAiPlan.fixtures,
    suggestions: fixtureAiPlan.suggestions,
    alerts: fixtureAiPlan.alerts,
    rescheduleSuggestions: fixtureAiPlan.rescheduleSuggestions
  });

  const handleGenerateFixtureAiPlan = async () => {
    if (!selectedEventId) {
      setError('Select an event before generating an experimental AI fixture plan.');
      return;
    }

    if (confirmedTeams.length < 2) {
      setError('At least two confirmed teams are required for the experimental AI planner.');
      return;
    }

    setFixtureAiGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await generateExperimentalFixturePlan(
        selectedEventId,
        buildFixtureAiRequestPayload(fixtureAiForm)
      );
      syncFixtureAiState(response, selectedEvent, configuration);
      setSuccess('Experimental AI fixture draft generated successfully.');
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Unable to generate the experimental AI fixture plan.')
      );
    } finally {
      setFixtureAiGenerating(false);
    }
  };

  const handleSaveFixtureAiDraft = async () => {
    if (!selectedEventId) {
      setError('Select an event before saving the experimental AI fixture draft.');
      return;
    }

    if (!fixtureAiPlan.fixtures.length) {
      setError('Generate an experimental AI fixture draft before saving edits.');
      return;
    }

    setFixtureAiSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await saveExperimentalFixturePlanDraft(
        selectedEventId,
        buildFixtureAiDraftPayload()
      );
      syncFixtureAiState(response, selectedEvent, configuration);
      setSuccess('Experimental AI fixture draft saved successfully.');
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Unable to save the experimental AI fixture draft.')
      );
    } finally {
      setFixtureAiSaving(false);
    }
  };

  const handleApproveFixtureAiPlan = async () => {
    if (!selectedEventId) {
      setError('Select an event before approving the experimental AI plan.');
      return;
    }

    if (!fixtureAiPlan.fixtures.length) {
      setError('Generate and review an experimental AI plan before approving it.');
      return;
    }

    let replaceExisting = false;

    if (matches.length) {
      replaceExisting = window.confirm(
        'Live fixtures already exist for this event. Replace the current live fixture list with the approved AI plan?'
      );

      if (!replaceExisting) {
        return;
      }
    }

    setFixtureAiApproving(true);
    setError('');
    setSuccess('');

    try {
      const response = await approveExperimentalFixturePlan(selectedEventId, { replaceExisting });
      await refreshWorkspace();
      setSuccess(
        `Experimental AI plan approved successfully. ${response.appliedFixtures || 0} fixtures were published to the live schedule.`
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to approve the experimental AI plan.'));
    } finally {
      setFixtureAiApproving(false);
    }
  };

  const handleRejectFixtureAiPlan = async () => {
    if (!selectedEventId) {
      setError('Select an event before rejecting the experimental AI plan.');
      return;
    }

    if (!fixtureAiPlan.fixtures.length) {
      setError('There is no experimental AI plan to reject.');
      return;
    }

    const shouldReject = window.confirm(
      'Reject this experimental AI plan? The draft will remain separate from the live schedule and will be marked as rejected.'
    );

    if (!shouldReject) {
      return;
    }

    setFixtureAiRejecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await rejectExperimentalFixturePlan(selectedEventId);
      syncFixtureAiState(response, selectedEvent, configuration);
      setSuccess('Experimental AI fixture plan rejected.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to reject the experimental AI plan.'));
    } finally {
      setFixtureAiRejecting(false);
    }
  };

  const handleMatchSelection = (eventValue) => {
    setSelectedMatchId(eventValue.target.value);
    setError('');
    setSuccess('');
  };

  const handleSaveFixtureAdjustments = async () => {
    if (!editableMatch._id) {
      setError('Select a match before saving fixture adjustments.');
      return;
    }

    setUpdatingMatchRecord(true);
    setError('');
    setSuccess('');

    try {
      await updateMatch(editableMatch._id, {
        teamA: editableMatch.teamA,
        teamB: editableMatch.teamB,
        teamASource: editableMatch.teamASource,
        teamBSource: editableMatch.teamBSource,
        matchType: editableMatch.matchType,
        groupName: editableMatch.groupName,
        venue: editableMatch.venue,
        date: editableMatch.date,
        time: editableMatch.time,
        roundNumber: editableMatch.roundNumber,
        roundLabel: editableMatch.roundLabel,
        matchNumber: editableMatch.matchNumber,
        officialName: editableMatch.officialName,
        officialRole: editableMatch.officialRole,
        status: editableMatch.status,
        cancellationReason: editableMatch.cancellationReason
      });
      await refreshWorkspace();
      setSuccess('Fixture details updated successfully.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to update the fixture.'));
    } finally {
      setUpdatingMatchRecord(false);
    }
  };

  const handleSaveMatchResults = async (finalizeResult = false) => {
    if (!editableMatch._id) {
      setError('Select a match before updating the result.');
      return;
    }

    setUpdatingMatchRecord(true);
    setError('');
    setSuccess('');

    try {
      await updateMatch(editableMatch._id, {
        ...editableMatch,
        status: finalizeResult ? 'Completed' : editableMatch.status,
        resultLocked: finalizeResult
      });
      await refreshWorkspace();
      setSuccess(
        finalizeResult ? 'Result finalized and locked successfully.' : 'Result draft saved successfully.'
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to save the match result.'));
    } finally {
      setUpdatingMatchRecord(false);
    }
  };

  const renderConfigurationTab = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Tournament Format</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{configuration.matchFormat}</p>
          <p className="mt-2 text-sm text-slate-500">
            Built around {configuration.sportType || selectedEvent?.sportType || 'the selected sport'}.
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Registered Teams</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{configuration.numberOfTeams}</p>
          <p className="mt-2 text-sm text-slate-500">
            Group stage and knockout defaults scale from this team count.
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Squad Limit</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{configuration.maxPlayersPerTeam}</p>
          <p className="mt-2 text-sm text-slate-500">
            Applied as the recommended maximum players per team for this event.
          </p>
        </div>
      </div>

      <section className="panel space-y-6 p-6">
        <SectionIntro
          title="Match Configuration"
          description="Set the core tournament format, team distribution, group-stage setup, and knockout path that the fixture generator should follow."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="label" htmlFor="match-format">
              Match Format
            </label>
            <select
              className="input"
              id="match-format"
              onChange={(event) => updateConfigurationField('matchFormat', event.target.value)}
              value={configuration.matchFormat}
            >
              {matchFormatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="number-of-teams">
              Number of Teams
            </label>
            <input
              className="input"
              id="number-of-teams"
              min="0"
              onChange={(event) => updateConfigurationField('numberOfTeams', event.target.value)}
              type="number"
              value={configuration.numberOfTeams}
            />
          </div>
          <div>
            <label className="label" htmlFor="max-players-per-team">
              Maximum Players per Team
            </label>
            <input
              className="input"
              id="max-players-per-team"
              min="1"
              onChange={(event) => updateConfigurationField('maxPlayersPerTeam', event.target.value)}
              type="number"
              value={configuration.maxPlayersPerTeam}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Group Stage</h3>
                <p className="mt-1 text-sm text-slate-500">Enable group play before knockout rounds.</p>
              </div>
              <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                <input
                  checked={configuration.groupStageEnabled}
                  onChange={(event) => updateConfigurationField('groupStageEnabled', event.target.checked)}
                  type="checkbox"
                />
                Enabled
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="number-of-groups">
                  Number of Groups
                </label>
                <input
                  className="input"
                  disabled={!configuration.groupStageEnabled}
                  id="number-of-groups"
                  min="1"
                  onChange={(event) => updateConfigurationField('numberOfGroups', event.target.value)}
                  type="number"
                  value={configuration.numberOfGroups}
                />
              </div>
              <div>
                <label className="label" htmlFor="teams-per-group">
                  Teams per Group
                </label>
                <input
                  className="input"
                  disabled={!configuration.groupStageEnabled}
                  id="teams-per-group"
                  min="1"
                  onChange={(event) => updateConfigurationField('teamsPerGroup', event.target.value)}
                  type="number"
                  value={configuration.teamsPerGroup}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Knockout Stage</h3>
                <p className="mt-1 text-sm text-slate-500">Configure quarterfinals, semifinals, finals, and the third-place playoff.</p>
              </div>
              <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                <input
                  checked={configuration.knockoutStageEnabled}
                  onChange={(event) => updateConfigurationField('knockoutStageEnabled', event.target.checked)}
                  type="checkbox"
                />
                Enabled
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['quarterfinalsEnabled', 'Quarterfinals'],
                ['semifinalsEnabled', 'Semifinals'],
                ['finalEnabled', 'Final'],
                ['thirdPlaceMatchEnabled', 'Third Place Match']
              ].map(([field, label]) => (
                <label className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700" key={field}>
                  <input
                    checked={Boolean(configuration[field])}
                    onChange={(event) => updateConfigurationField(field, event.target.checked)}
                    type="checkbox"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            className="btn-primary"
            disabled={configSaving}
            onClick={() => handleSaveConfiguration('Match configuration saved successfully.')}
            type="button"
          >
            {configSaving ? 'Saving...' : 'Save Match Configuration'}
          </button>
        </div>
      </section>
    </div>
  );

  const renderFixturesTab = () => (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
        <section className="panel space-y-5 p-6">
          <SectionIntro
            title="Auto Generate Fixtures"
            description="Generate a group-stage, league, or knockout fixture list using the saved configuration, confirmed teams, and the base kickoff slot below."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <input
              className="input"
              onChange={(event) => setFixtureBatch((current) => ({ ...current, date: event.target.value }))}
              type="date"
              value={fixtureBatch.date}
            />
            <input
              className="input"
              onChange={(event) => setFixtureBatch((current) => ({ ...current, time: event.target.value }))}
              type="time"
              value={fixtureBatch.time}
            />
            <input
              className="input"
              onChange={(event) => setFixtureBatch((current) => ({ ...current, venue: event.target.value }))}
              placeholder="Venue"
              value={fixtureBatch.venue}
            />
          </div>

          <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p>
              The generator uses the saved stage layout. Group stage enabled: <strong>{configuration.groupStageEnabled ? 'Yes' : 'No'}</strong>. Knockout stage enabled: <strong>{configuration.knockoutStageEnabled ? 'Yes' : 'No'}</strong>.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              className="btn-primary"
              disabled={autoGenerating || confirmedTeams.length < 2}
              onClick={handleAutoGenerateFixtures}
              type="button"
            >
              {autoGenerating ? 'Generating...' : 'Auto Generate Fixtures'}
            </button>
          </div>
        </section>

        <form className="panel space-y-5 p-6" onSubmit={handleCreateMatch}>
          <SectionIntro
            title="Manual Fixture Adjustment"
            description="Create or tweak fixtures manually when the tournament needs custom pairings, venue overrides, or official assignments."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TypeaheadSelect
              onChange={(event) => setForm((current) => ({ ...current, teamA: event.target.value }))}
              options={teamOptions}
              placeholder="Select Team A"
              searchPlaceholder="Search Team A"
              value={form.teamA}
            />
            <TypeaheadSelect
              onChange={(event) => setForm((current) => ({ ...current, teamB: event.target.value }))}
              options={teamOptions}
              placeholder="Select Team B"
              searchPlaceholder="Search Team B"
              value={form.teamB}
            />
            <select
              className="input"
              onChange={(event) => setForm((current) => ({ ...current, matchType: event.target.value }))}
              value={form.matchType}
            >
              {matchTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="input"
              onChange={(event) => setForm((current) => ({ ...current, groupName: event.target.value }))}
              placeholder="Group name if applicable"
              value={form.groupName}
            />
            <input
              className="input"
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              required
              type="date"
              value={form.date}
            />
            <input
              className="input"
              onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              required
              type="time"
              value={form.time}
            />
            <input
              className="input"
              onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))}
              placeholder="Venue"
              required
              value={form.venue}
            />
            <input
              className="input"
              onChange={(event) => setForm((current) => ({ ...current, officialName: event.target.value }))}
              placeholder="Umpire or referee"
              value={form.officialName}
            />
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" disabled={creatingMatch} type="submit">
              {creatingMatch ? 'Saving...' : 'Create Manual Match'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <section className="panel space-y-5 p-6">
          <SectionIntro
            title="Published Fixtures"
            description="Review the current fixture list, then select a match below to edit opponents, schedule, venue, officials, and stage labels."
          />

          {sortedMatches.length ? (
            <>
              <TypeaheadSelect
                onChange={handleMatchSelection}
                options={matchOptions}
                placeholder="Select match to edit"
                searchPlaceholder="Search fixtures"
                value={selectedMatchId}
              />

              <div className="space-y-3">
                {sortedMatches.map((match) => (
                  <button
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                      match._id === selectedMatchId
                        ? 'border-brand-blue bg-brand-mist'
                        : 'border-slate-200 bg-slate-50 hover:border-brand-blue/30'
                    }`}
                    key={match._id}
                    onClick={() => setSelectedMatchId(match._id)}
                    type="button"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`badge ${getMatchTypeBadgeClass(match.matchType)}`}>{match.matchType || 'Match'}</span>
                          <span className={`badge ${getMatchStatusBadgeClass(match.status)}`}>{match.status}</span>
                        </div>
                        <p className="mt-3 text-lg font-bold text-slate-950">{match.teamA} vs {match.teamB}</p>
                        <p className="mt-2 text-sm text-slate-500">
                          {match.roundLabel || 'Stage pending'}{match.groupName ? ` - ${match.groupName}` : ''}
                        </p>
                      </div>
                      <div className="text-sm text-slate-500">
                        <p>{match.scheduledAt ? formatDateTime(match.scheduledAt) : 'Schedule pending'}</p>
                        <p className="mt-1">{match.venue || 'Venue pending'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No fixtures are available yet for this event.</p>
          )}
        </section>

        {editableMatch._id ? (
          <section className="panel space-y-5 p-6">
            <SectionIntro
              title="Edit Match Details"
              description="Adjust date, time, venue, opponents, stage type, or official assignments for the selected match."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <TypeaheadSelect
                onChange={(event) => setEditableMatch((current) => ({ ...current, teamA: event.target.value }))}
                options={teamOptions}
                placeholder="Select Team A"
                searchPlaceholder="Search Team A"
                value={editableMatch.teamA}
              />
              <TypeaheadSelect
                onChange={(event) => setEditableMatch((current) => ({ ...current, teamB: event.target.value }))}
                options={teamOptions}
                placeholder="Select Team B"
                searchPlaceholder="Search Team B"
                value={editableMatch.teamB}
              />
              <select
                className="input"
                onChange={(event) => setEditableMatch((current) => ({ ...current, matchType: event.target.value }))}
                value={editableMatch.matchType}
              >
                {matchTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="input"
                onChange={(event) => setEditableMatch((current) => ({ ...current, status: event.target.value }))}
                value={editableMatch.status}
              >
                {matchStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                className="input"
                onChange={(event) => setEditableMatch((current) => ({ ...current, groupName: event.target.value }))}
                placeholder="Group name"
                value={editableMatch.groupName}
              />
              <input
                className="input"
                onChange={(event) => setEditableMatch((current) => ({ ...current, roundLabel: event.target.value }))}
                placeholder="Round label"
                value={editableMatch.roundLabel}
              />
              <input
                className="input"
                onChange={(event) => setEditableMatch((current) => ({ ...current, date: event.target.value }))}
                type="date"
                value={editableMatch.date}
              />
              <input
                className="input"
                onChange={(event) => setEditableMatch((current) => ({ ...current, time: event.target.value }))}
                type="time"
                value={editableMatch.time}
              />
              <input
                className="input"
                onChange={(event) => setEditableMatch((current) => ({ ...current, venue: event.target.value }))}
                placeholder="Venue"
                value={editableMatch.venue}
              />
              <input
                className="input"
                onChange={(event) => setEditableMatch((current) => ({ ...current, officialName: event.target.value }))}
                placeholder="Official name"
                value={editableMatch.officialName}
              />
              <select
                className="input"
                onChange={(event) => setEditableMatch((current) => ({ ...current, officialRole: event.target.value }))}
                value={editableMatch.officialRole}
              >
                <option value="">Select official role</option>
                {officialRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                className="input"
                onChange={(event) => setEditableMatch((current) => ({ ...current, cancellationReason: event.target.value }))}
                placeholder="Cancellation or reschedule reason"
                value={editableMatch.cancellationReason}
              />
            </div>

            <div className="flex justify-end">
              <button
                className="btn-primary"
                disabled={updatingMatchRecord || editableMatch.resultLocked}
                onClick={handleSaveFixtureAdjustments}
                type="button"
              >
                {updatingMatchRecord ? 'Saving...' : editableMatch.resultLocked ? 'Result Locked' : 'Save Fixture Changes'}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      </div>

    </div>
  );

  const renderPlannerTab = () => (
    <FixtureTreePanel
      eventName={selectedEvent?.name || 'Fixture Planner'}
      matches={sortedMatches}
      onPrintError={setError}
      onPrintSuccess={setSuccess}
      onSelectMatch={setSelectedMatchId}
      selectedMatchId={selectedMatchId}
    />
  );

  const renderAiLabTab = () => (
    <ExperimentalFixtureLab
      approving={fixtureAiApproving}
      configuration={configuration}
      confirmedTeams={confirmedTeams}
      event={selectedEvent}
      form={fixtureAiForm}
      generating={fixtureAiGenerating}
      loading={contextLoading}
      matches={matches}
      onApprove={handleApproveFixtureAiPlan}
      onGenerate={handleGenerateFixtureAiPlan}
      onReject={handleRejectFixtureAiPlan}
      onSaveDraft={handleSaveFixtureAiDraft}
      plan={fixtureAiPlan}
      rejecting={fixtureAiRejecting}
      saving={fixtureAiSaving}
      setForm={setFixtureAiForm}
      setPlan={setFixtureAiPlan}
    />
  );

  const renderPointsTab = () => (
    <section className="panel space-y-6 p-6">
      <SectionIntro
        title="Points System"
        description="Control win, draw, loss, and optional bonus points so standings update with the right tournament rules for cricket or football."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['winPoints', 'Win Points'],
          ['drawPoints', 'Draw Points'],
          ['lossPoints', 'Loss Points'],
          ['bonusPoints', 'Bonus Points']
        ].map(([field, label]) => (
          <div key={field}>
            <label className="label" htmlFor={field}>
              {label}
            </label>
            <input
              className="input"
              id={field}
              min="0"
              onChange={(event) => updateConfigurationField(field, event.target.value)}
              type="number"
              value={configuration[field]}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Win Rule</p>
          <p className="mt-3 text-xl font-bold text-slate-950">{configuration.winPoints} points for every win</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Draw Rule</p>
          <p className="mt-3 text-xl font-bold text-slate-950">{configuration.drawPoints} points for a draw or tie</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Bonus Rule</p>
          <p className="mt-3 text-xl font-bold text-slate-950">Up to {configuration.bonusPoints} bonus points per team</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" disabled={configSaving} onClick={() => handleSaveConfiguration('Points system updated successfully.')} type="button">
          {configSaving ? 'Saving...' : 'Save Points System'}
        </button>
      </div>
    </section>
  );

  const renderTeamsTab = () => (
    <section className="panel space-y-6 p-6">
      <SectionIntro
        title="Team Registration"
        description="Review each registered squad, capture captain contact details for match communication, and upload team branding when it is available."
      />

      {configuration.teamProfiles.length ? (
        <div className="space-y-5">
          {configuration.teamProfiles.map((profile) => {
            const teamProfileId = profile.id || profile.registrationId || profile.teamName;

            return (
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={teamProfileId}>
                <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <div className="flex h-40 items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white">
                      {profile.teamLogoUrl ? (
                        <img alt={`${profile.teamName} logo`} className="h-full w-full object-cover" src={profile.teamLogoUrl} />
                      ) : (
                        <div className="text-center text-sm text-slate-400">
                          <AppIcon className="mx-auto h-6 w-6" name="users" />
                          <p className="mt-2">No team logo</p>
                        </div>
                      )}
                    </div>
                    <label className="btn-secondary cursor-pointer justify-center text-center">
                      Upload Team Logo
                      <input className="hidden" onChange={(event) => handleTeamLogoUpload(teamProfileId, event.target.files?.[0])} type="file" />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="label">Team Name</label>
                      <input className="input" disabled value={profile.teamName} />
                    </div>
                    <div>
                      <label className="label">Captain Name</label>
                      <input className="input" onChange={(event) => updateTeamProfileField(teamProfileId, 'captainName', event.target.value)} value={profile.captainName} />
                    </div>
                    <div>
                      <label className="label">Captain Contact</label>
                      <input className="input" onChange={(event) => updateTeamProfileField(teamProfileId, 'captainContact', event.target.value)} value={profile.captainContact} />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input className="input" onChange={(event) => updateTeamProfileField(teamProfileId, 'email', event.target.value)} value={profile.email} />
                    </div>
                    <div>
                      <label className="label">Primary Phone</label>
                      <input className="input" onChange={(event) => updateTeamProfileField(teamProfileId, 'phone1', event.target.value)} value={profile.phone1} />
                    </div>
                    <div>
                      <label className="label">Secondary Phone</label>
                      <input className="input" onChange={(event) => updateTeamProfileField(teamProfileId, 'phone2', event.target.value)} value={profile.phone2} />
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-white px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Players Listed</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">{profile.players?.length || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Maximum Squad</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">{configuration.maxPlayersPerTeam}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Registration Status</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">Confirmed</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No confirmed team registrations are available for the selected event.</p>
      )}

      <div className="flex justify-end">
        <button className="btn-primary" disabled={configSaving} onClick={() => handleSaveConfiguration('Team registration details saved successfully.')} type="button">
          {configSaving ? 'Saving...' : 'Save Team Details'}
        </button>
      </div>
    </section>
  );

  const renderPlayersTab = () => {
    const teamProfileId = selectedTeamProfile?.id || selectedTeamProfile?.registrationId || selectedTeamProfile?.teamName || '';

    return (
      <section className="panel space-y-6 p-6">
        <SectionIntro
          title="Player Management"
          description="Maintain player roles, jersey numbers, and optional player photos for the selected team so officials and admins can identify squads quickly."
        />

        {configuration.teamProfiles.length ? (
          <>
            <TypeaheadSelect onChange={(event) => setSelectedTeamProfileId(event.target.value)} options={teamProfileOptions} placeholder="Select team" searchPlaceholder="Search teams" value={teamProfileId} />

            {selectedTeamProfile ? (
              <div className="space-y-4">
                {(selectedTeamProfile.players || []).map((player) => (
                  <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={player.id}>
                    <div className="grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)]">
                      <div className="space-y-3">
                        <div className="flex h-36 items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white">
                          {player.photoUrl ? (
                            <img alt={player.name} className="h-full w-full object-cover" src={player.photoUrl} />
                          ) : (
                            <div className="text-center text-sm text-slate-400">
                              <AppIcon className="mx-auto h-6 w-6" name="users" />
                              <p className="mt-2">No photo</p>
                            </div>
                          )}
                        </div>
                        <label className="btn-secondary cursor-pointer justify-center text-center">
                          Upload Photo
                          <input className="hidden" onChange={(event) => handlePlayerPhotoUpload(teamProfileId, player.id, event.target.files?.[0])} type="file" />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="label">Player Name</label>
                          <input className="input" disabled value={player.name} />
                        </div>
                        <div>
                          <label className="label">Phone</label>
                          <input className="input" disabled value={player.phone || 'Not provided'} />
                        </div>
                        <div>
                          <label className="label">Player Role</label>
                          <input
                            className="input"
                            onChange={(event) => updatePlayerField(teamProfileId, player.id, 'role', event.target.value)}
                            placeholder={configuration.sportType === 'Football' ? 'Goalkeeper / Defender / Midfielder / Forward' : 'Batsman / Bowler / All-rounder / Wicketkeeper'}
                            value={player.role}
                          />
                        </div>
                        <div>
                          <label className="label">Jersey Number</label>
                          <input className="input" onChange={(event) => updatePlayerField(teamProfileId, player.id, 'jerseyNumber', event.target.value)} placeholder="10" value={player.jerseyNumber} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">Address</label>
                          <input className="input" disabled value={player.address || 'Not provided'} />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Player records will appear here after teams register and confirm their squads.</p>
        )}

        <div className="flex justify-end">
          <button className="btn-primary" disabled={configSaving} onClick={() => handleSaveConfiguration('Player management details saved successfully.')} type="button">
            {configSaving ? 'Saving...' : 'Save Player Details'}
          </button>
        </div>
      </section>
    );
  };

  const renderResultsTab = () => {
    const winnerOptions = [
      { value: '', label: 'Draw / No winner yet' },
      ...(editableMatch.teamA ? [{ value: editableMatch.teamA, label: editableMatch.teamA }] : []),
      ...(editableMatch.teamB ? [{ value: editableMatch.teamB, label: editableMatch.teamB }] : [])
    ];

    return (
      <section className="panel space-y-6 p-6">
        <SectionIntro
          title="Match Results Entry"
          description="Capture the winner, status, score details, bonus points, and the man of the match. Finalized results are locked after confirmation."
        />

        {sortedMatches.length ? (
          <>
            <TypeaheadSelect onChange={handleMatchSelection} options={matchOptions} placeholder="Select match" searchPlaceholder="Search matches" value={selectedMatchId} />

            <div className="grid gap-4 md:grid-cols-2">
              <select className="input" onChange={(event) => setEditableMatch((current) => ({ ...current, status: event.target.value }))} value={editableMatch.status}>
                {matchStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <TypeaheadSelect onChange={(event) => setEditableMatch((current) => ({ ...current, winnerTeam: event.target.value }))} options={winnerOptions} placeholder="Select winner" searchPlaceholder="Search winner" value={editableMatch.winnerTeam} />
            </div>

            {configuration.sportType === 'Football' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">{editableMatch.teamA || 'Team A'} Goals</label>
                  <input className="input" onChange={(event) => setEditableMatch((current) => ({ ...current, teamAGoals: event.target.value }))} type="number" value={editableMatch.teamAGoals} />
                </div>
                <div>
                  <label className="label">{editableMatch.teamB || 'Team B'} Goals</label>
                  <input className="input" onChange={(event) => setEditableMatch((current) => ({ ...current, teamBGoals: event.target.value }))} type="number" value={editableMatch.teamBGoals} />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  ['teamARuns', `${editableMatch.teamA || 'Team A'} Runs`],
                  ['teamAWickets', `${editableMatch.teamA || 'Team A'} Wickets`],
                  ['teamAOvers', `${editableMatch.teamA || 'Team A'} Overs`],
                  ['teamBRuns', `${editableMatch.teamB || 'Team B'} Runs`],
                  ['teamBWickets', `${editableMatch.teamB || 'Team B'} Wickets`],
                  ['teamBOvers', `${editableMatch.teamB || 'Team B'} Overs`]
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className="label">{label}</label>
                    <input
                      className="input"
                      onChange={(event) => setEditableMatch((current) => ({ ...current, [field]: event.target.value }))}
                      placeholder={field.includes('Overs') ? '7.4' : ''}
                      type={field.includes('Overs') ? 'text' : 'number'}
                      value={editableMatch[field]}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="label">{editableMatch.teamA || 'Team A'} Bonus Points</label>
                <input className="input" onChange={(event) => setEditableMatch((current) => ({ ...current, teamABonusPoints: event.target.value }))} type="number" value={editableMatch.teamABonusPoints} />
              </div>
              <div>
                <label className="label">{editableMatch.teamB || 'Team B'} Bonus Points</label>
                <input className="input" onChange={(event) => setEditableMatch((current) => ({ ...current, teamBBonusPoints: event.target.value }))} type="number" value={editableMatch.teamBBonusPoints} />
              </div>
              <div>
                <label className="label">Man of the Match</label>
                <input className="input" onChange={(event) => setEditableMatch((current) => ({ ...current, manOfTheMatch: event.target.value }))} placeholder="Player name" value={editableMatch.manOfTheMatch} />
              </div>
              <div>
                <label className="label">Result Notes</label>
                <input className="input" onChange={(event) => setEditableMatch((current) => ({ ...current, resultNotes: event.target.value }))} placeholder="Short result summary" value={editableMatch.resultNotes} />
              </div>
            </div>

            {['Cancelled', 'Postponed', 'Abandoned'].includes(editableMatch.status) ? (
              <div>
                <label className="label">Reason</label>
                <textarea className="input min-h-[120px] py-3" onChange={(event) => setEditableMatch((current) => ({ ...current, cancellationReason: event.target.value }))} placeholder="Explain the postponement, abandonment, or cancellation." value={editableMatch.cancellationReason} />
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button className="btn-secondary" disabled={updatingMatchRecord || editableMatch.resultLocked} onClick={() => handleSaveMatchResults(false)} type="button">
                {updatingMatchRecord ? 'Saving...' : editableMatch.resultLocked ? 'Result Locked' : 'Save Result Draft'}
              </button>
              <button className="btn-primary" disabled={updatingMatchRecord || editableMatch.resultLocked} onClick={() => handleSaveMatchResults(true)} type="button">
                {editableMatch.resultLocked ? 'Result Locked' : 'Finalize Results'}
              </button>
            </div>
          </>
        ) : (
          <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Results entry will appear once at least one fixture has been created.</p>
        )}
      </section>
    );
  };

  const renderStandingsTab = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Teams Ranked</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{standings.length}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Completed Fixtures</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{matchSummary.completed}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Qualification Path</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{configuration.quarterfinalsEnabled ? 'Quarterfinals' : configuration.semifinalsEnabled ? 'Semifinals' : 'Final'}</p>
        </div>
      </div>

      <section className="panel overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-2xl font-bold text-slate-950">Points Table</h2>
          <p className="mt-2 text-sm text-slate-500">Rankings are sorted by points, then goal difference for football or net run rate for cricket.</p>
        </div>

        {standings.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  {['Rank', 'Team', 'P', 'W', 'D', 'L', 'Pts', configuration.sportType === 'Football' ? 'GD' : 'NRR', 'Status'].map((header) => (
                    <th className="px-6 py-4 font-semibold" key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr className="border-t border-slate-100" key={row.teamName}>
                    <td className="px-6 py-4 font-semibold text-slate-950">{row.rank}</td>
                    <td className="px-6 py-4 font-semibold text-slate-950">{row.teamName}</td>
                    <td className="px-6 py-4 text-slate-600">{row.played}</td>
                    <td className="px-6 py-4 text-slate-600">{row.wins}</td>
                    <td className="px-6 py-4 text-slate-600">{row.draws}</td>
                    <td className="px-6 py-4 text-slate-600">{row.losses}</td>
                    <td className="px-6 py-4 text-slate-950">{row.points}</td>
                    <td className="px-6 py-4 text-slate-600">{configuration.sportType === 'Football' ? row.goalDifference : row.netRunRate.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${row.qualificationStatus === 'Qualified' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{row.qualificationStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-6 text-sm text-slate-500">Standings will appear after completed results are recorded.</p>
        )}
      </section>
    </div>
  );

  const renderKnockoutTab = () => (
    <section className="panel space-y-6 p-6">
      <SectionIntro
        title="Knockout and Finals Setup"
        description="Assign group winners and runners-up to quarterfinals, connect semifinal sources, and set the date, time, and venue for the final and optional third-place match."
      />

      {configuration.quarterfinalsEnabled ? (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-950">Quarterfinal Configuration</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            {configuration.quarterfinalPairings.map((pairing) => (
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4" key={pairing.id}>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">{pairing.label}</p>
                <div className="mt-4 grid gap-3">
                  <input className="input" onChange={(event) => updatePairingField('quarterfinalPairings', pairing.id, 'teamA', event.target.value)} placeholder="Team A source" value={pairing.teamA} />
                  <input className="input" onChange={(event) => updatePairingField('quarterfinalPairings', pairing.id, 'teamB', event.target.value)} placeholder="Team B source" value={pairing.teamB} />
                  <div className="grid gap-3 md:grid-cols-3">
                    <input className="input" onChange={(event) => updatePairingField('quarterfinalPairings', pairing.id, 'date', event.target.value)} type="date" value={pairing.date} />
                    <input className="input" onChange={(event) => updatePairingField('quarterfinalPairings', pairing.id, 'time', event.target.value)} type="time" value={pairing.time} />
                    <input className="input" onChange={(event) => updatePairingField('quarterfinalPairings', pairing.id, 'venue', event.target.value)} placeholder="Venue" value={pairing.venue} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {configuration.semifinalsEnabled ? (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-950">Semifinal Configuration</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            {configuration.semifinalPairings.map((pairing) => (
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4" key={pairing.id}>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">{pairing.label}</p>
                <div className="mt-4 grid gap-3">
                  <input className="input" onChange={(event) => updatePairingField('semifinalPairings', pairing.id, 'teamA', event.target.value)} placeholder="Team A source" value={pairing.teamA} />
                  <input className="input" onChange={(event) => updatePairingField('semifinalPairings', pairing.id, 'teamB', event.target.value)} placeholder="Team B source" value={pairing.teamB} />
                  <div className="grid gap-3 md:grid-cols-3">
                    <input className="input" onChange={(event) => updatePairingField('semifinalPairings', pairing.id, 'date', event.target.value)} type="date" value={pairing.date} />
                    <input className="input" onChange={(event) => updatePairingField('semifinalPairings', pairing.id, 'time', event.target.value)} type="time" value={pairing.time} />
                    <input className="input" onChange={(event) => updatePairingField('semifinalPairings', pairing.id, 'venue', event.target.value)} placeholder="Venue" value={pairing.venue} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-bold text-slate-950">Final Match</h3>
          <div className="mt-4 grid gap-3">
            <input className="input" onChange={(event) => updateNestedMatchField('finalMatch', 'teamA', event.target.value)} placeholder="Team A source" value={configuration.finalMatch.teamA || ''} />
            <input className="input" onChange={(event) => updateNestedMatchField('finalMatch', 'teamB', event.target.value)} placeholder="Team B source" value={configuration.finalMatch.teamB || ''} />
            <div className="grid gap-3 md:grid-cols-3">
              <input className="input" onChange={(event) => updateNestedMatchField('finalMatch', 'date', event.target.value)} type="date" value={configuration.finalMatch.date || ''} />
              <input className="input" onChange={(event) => updateNestedMatchField('finalMatch', 'time', event.target.value)} type="time" value={configuration.finalMatch.time || ''} />
              <input className="input" onChange={(event) => updateNestedMatchField('finalMatch', 'venue', event.target.value)} placeholder="Venue" value={configuration.finalMatch.venue || ''} />
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-950">Third Place Match</h3>
            <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              <input checked={Boolean(configuration.thirdPlaceMatch.enabled)} onChange={(event) => updateNestedMatchField('thirdPlaceMatch', 'enabled', event.target.checked)} type="checkbox" />
              Enabled
            </label>
          </div>
          <div className="mt-4 grid gap-3">
            <input className="input" onChange={(event) => updateNestedMatchField('thirdPlaceMatch', 'teamA', event.target.value)} placeholder="Team A source" value={configuration.thirdPlaceMatch.teamA || ''} />
            <input className="input" onChange={(event) => updateNestedMatchField('thirdPlaceMatch', 'teamB', event.target.value)} placeholder="Team B source" value={configuration.thirdPlaceMatch.teamB || ''} />
            <div className="grid gap-3 md:grid-cols-3">
              <input className="input" onChange={(event) => updateNestedMatchField('thirdPlaceMatch', 'date', event.target.value)} type="date" value={configuration.thirdPlaceMatch.date || ''} />
              <input className="input" onChange={(event) => updateNestedMatchField('thirdPlaceMatch', 'time', event.target.value)} type="time" value={configuration.thirdPlaceMatch.time || ''} />
              <input className="input" onChange={(event) => updateNestedMatchField('thirdPlaceMatch', 'venue', event.target.value)} placeholder="Venue" value={configuration.thirdPlaceMatch.venue || ''} />
            </div>
          </div>
        </article>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" disabled={configSaving} onClick={() => handleSaveConfiguration('Knockout setup saved successfully.')} type="button">
          {configSaving ? 'Saving...' : 'Save Knockout Setup'}
        </button>
      </div>
    </section>
  );

  const renderNotificationsTab = () => {
    const upcomingMatches = matches.filter((match) => match.status === 'Scheduled').length;

    return (
      <section className="panel space-y-6 p-6">
        <SectionIntro
          title="Notifications and Alerts"
          description="Decide whether match schedule, result-published, and fixture-change alerts should be considered active for this event's operations workflow."
        />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['notifySchedule', 'Match Schedule Alert', 'Notify teams about upcoming fixtures.'],
            ['notifyResults', 'Result Published Alert', 'Notify teams when scores are published.'],
            ['notifyFixtureChanges', 'Fixture Change Alert', 'Notify teams when a fixture moves or changes.']
          ].map(([field, title, description]) => (
            <label className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={field}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-950">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                </div>
                <input checked={Boolean(configuration[field])} onChange={(event) => updateConfigurationField(field, event.target.checked)} type="checkbox" />
              </div>
            </label>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Upcoming Matches</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">{upcomingMatches}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Results Published</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">{matchSummary.completed}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Fixture Changes</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">{matchSummary.postponed}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn-primary" disabled={configSaving} onClick={() => handleSaveConfiguration('Notification preferences saved successfully.')} type="button">
            {configSaving ? 'Saving...' : 'Save Notification Settings'}
          </button>
        </div>
      </section>
    );
  };

  const renderCalendarTab = () => (
    <section className="panel space-y-6 p-6">
      <SectionIntro
        title="Match Calendar"
        description="Browse every scheduled match by day, filter by team, and use the color coding to separate league, knockout, and final-stage fixtures."
      />

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-4">
          <TypeaheadSelect
            onChange={(event) => setCalendarTeamFilter(event.target.value)}
            options={[
              { value: '', label: 'All Teams' },
              ...configuration.teamProfiles.map((profile) => ({
                value: profile.teamName,
                label: profile.teamName
              }))
            ]}
            placeholder="Filter by team"
            searchPlaceholder="Search team"
            value={calendarTeamFilter}
          />

          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Color coding</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-sky-400" />League and group stage</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-violet-400" />Knockout rounds</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" />Finals and third-place matches</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {calendarGroups.length ? (
            calendarGroups.map((group) => (
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={group.date}>
                <h3 className="text-lg font-bold text-slate-950">{group.date === 'Unscheduled' ? 'Unscheduled Matches' : formatDate(group.date)}</h3>
                <div className="mt-4 space-y-3">
                  {group.items.map((match) => (
                    <div className="rounded-2xl bg-white px-4 py-4" key={match._id}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`badge ${getMatchTypeBadgeClass(match.matchType)}`}>{match.matchType || 'Match'}</span>
                            <span className={`badge ${getMatchStatusBadgeClass(match.status)}`}>{match.status}</span>
                          </div>
                          <p className="mt-3 text-lg font-bold text-slate-950">{match.teamA} vs {match.teamB}</p>
                          <p className="mt-2 text-sm text-slate-500">
                            {match.roundLabel || 'Stage pending'}{match.groupName ? ` - ${match.groupName}` : ''}
                          </p>
                        </div>
                        <div className="text-sm text-slate-500">
                          <p>{match.time || 'Time pending'}</p>
                          <p className="mt-1">{match.venue || 'Venue pending'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No matches match the current calendar filter.</p>
          )}
        </div>
      </div>
    </section>
  );

  const renderActiveTab = () => {
    if (contextLoading) {
      return <LoadingSpinner label="Loading match workspace..." />;
    }

    switch (activeTab) {
      case 'configuration':
        return renderConfigurationTab();
      case 'fixtures':
        return renderFixturesTab();
      case 'planner':
        return renderPlannerTab();
      case 'aiLab':
        return renderAiLabTab();
      case 'points':
        return renderPointsTab();
      case 'teams':
        return renderTeamsTab();
      case 'players':
        return renderPlayersTab();
      case 'results':
        return renderResultsTab();
      case 'standings':
        return renderStandingsTab();
      case 'knockout':
        return renderKnockoutTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'calendar':
        return renderCalendarTab();
      default:
        return renderConfigurationTab();
    }
  };

  return (
    <AdminPageShell
      description="Configure tournament formats, generate fixtures, test experimental AI scheduling, manage squads, enter results, and review standings from one ordered match operations workspace."
      title="Schedule Management"
    >
      <div className="space-y-8">
        <div className="panel space-y-5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Event Match Operations</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Select an event to unlock its full match workspace, including format setup, live fixture generation, an experimental AI planning lab, team and player records, results entry, and rankings.
              </p>
            </div>
            <TypeaheadSelect className="max-w-sm" disabled={eventsLoading} onChange={handleEventChange} options={eventOptions} placeholder="Select event" searchPlaceholder="Search events" value={selectedEventId} />
          </div>

          <FormAlert message={error} />
          <FormAlert message={success} type="success" />

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Selected Event</p>
              <p className="mt-3 text-lg font-bold text-slate-950">{selectedEvent?.name || 'No event selected'}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Confirmed Teams</p>
              <p className="mt-3 text-2xl font-bold text-slate-950">{confirmedTeams.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Fixtures Created</p>
              <p className="mt-3 text-2xl font-bold text-slate-950">{matches.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Sport</p>
              <p className="mt-3 text-2xl font-bold text-slate-950">{configuration.sportType || selectedEvent?.sportType || 'Not set'}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="panel p-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {matchWorkspaceTabs.map((tab) => (
                <WorkspaceTabButton active={activeTab === tab.key} icon={tab.icon} key={tab.key} label={tab.label} onClick={() => setActiveTab(tab.key)} />
              ))}
            </div>
          </aside>

          <div className="min-w-0">{renderActiveTab()}</div>
        </div>
      </div>
    </AdminPageShell>
  );
}
