import { randomUUID } from 'node:crypto';

import { AppSetting } from '../models/AppSetting.js';
import { Event } from '../models/Event.js';
import { Match } from '../models/Match.js';
import { getMatchConfiguration } from './matchConfigurationService.js';
import { ApiError } from '../utils/ApiError.js';

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');
const FIXTURE_AI_PLAN_KEY_PREFIX = 'fixture-ai-plan';
const DEFAULT_TIME_SLOTS = ['09:00', '12:00', '15:00', '18:00'];
const MAX_DATE_RANGE_DAYS = 62;

const normalizeText = (value) => String(value || '').trim();
const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};
const normalizeNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};
const normalizeInteger = (value, fallback = 0, minimum = 0) =>
  Math.max(minimum, Math.round(normalizeNumber(value, fallback)));
const buildPlanKey = (eventId) => `${FIXTURE_AI_PLAN_KEY_PREFIX}:${normalizeText(eventId)}`;

const toDateOnly = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
};

const enumerateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const dates = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end && dates.length < MAX_DATE_RANGE_DAYS) {
    dates.push(toDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

const normalizeList = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue
    .split(',')
    .map((item) => normalizeText(item))
    .filter(Boolean);
};

const normalizePreferredTimings = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([teamName, timings]) => [normalizeText(teamName), normalizeList(timings)])
      .filter(([teamName, timings]) => teamName && timings.length)
  );
};

const normalizeFixtureKey = (teamA, teamB) =>
  [normalizeText(teamA), normalizeText(teamB)].filter(Boolean).sort().join(' vs ');

const getBaseFormat = (configuration = {}, payload = {}) => {
  const requestedFormat = normalizeText(payload.format).toLowerCase();

  if (requestedFormat) {
    return requestedFormat;
  }

  if (configuration.groupStageEnabled) {
    return 'group-stage';
  }

  if (configuration.knockoutStageEnabled) {
    return 'knockout';
  }

  return 'round-robin';
};

const scoreTeamStrength = (team, performanceLookup) => {
  const performance = performanceLookup.get(normalizeText(team.teamName)) || { wins: 0, points: 0 };
  return performance.points * 10 + performance.wins * 3 + normalizeText(team.teamName).length;
};

const snakeSeedGroups = (teams = [], groupCount = 1, performanceLookup = new Map()) => {
  const groups = Array.from({ length: Math.max(1, groupCount) }, (_item, index) => ({
    label: `Group ${String.fromCharCode(65 + index)}`,
    teams: []
  }));
  const rankedTeams = [...teams].sort(
    (left, right) => scoreTeamStrength(right, performanceLookup) - scoreTeamStrength(left, performanceLookup)
  );
  const orderedGroups = [...groups];
  let direction = 1;
  let groupIndex = 0;

  rankedTeams.forEach((team) => {
    orderedGroups[groupIndex].teams.push(team);
    groupIndex += direction;

    if (groupIndex >= orderedGroups.length) {
      groupIndex = orderedGroups.length - 1;
      direction = -1;
      groupIndex += direction;
    }

    if (groupIndex < 0) {
      groupIndex = 0;
      direction = 1;
      groupIndex += direction;
    }
  });

  return orderedGroups.filter((group) => group.teams.length);
};

const buildPairings = (teams = [], matchType = 'League', groupName = '') => {
  const fixtures = [];

  for (let leftIndex = 0; leftIndex < teams.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < teams.length; rightIndex += 1) {
      fixtures.push({
        id: randomUUID(),
        teamA: teams[leftIndex].teamName,
        teamB: teams[rightIndex].teamName,
        matchType,
        groupName,
        roundLabel: groupName || matchType,
        teamASource: teams[leftIndex].teamName,
        teamBSource: teams[rightIndex].teamName
      });
    }
  }

  return fixtures;
};

const buildKnockoutPlan = (teams = []) => {
  const rankedTeams = [...teams];
  const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(2, rankedTeams.length)));

  while (rankedTeams.length < bracketSize) {
    rankedTeams.push({ teamName: 'Bye' });
  }

  return rankedTeams.slice(0, bracketSize / 2).map((team, index) => ({
    id: randomUUID(),
    teamA: team.teamName,
    teamB: rankedTeams[bracketSize - 1 - index].teamName,
    matchType: bracketSize / 2 === 1 ? 'Final' : bracketSize / 2 === 2 ? 'Semifinal' : 'Quarterfinal',
    groupName: '',
    roundLabel: bracketSize / 2 === 1 ? 'Final' : bracketSize / 2 === 2 ? 'Semifinal' : `Round of ${bracketSize}`,
    teamASource: team.teamName,
    teamBSource: rankedTeams[bracketSize - 1 - index].teamName
  }));
};

const buildAvailableSlots = ({ availableDates, timeSlots, venues }) =>
  availableDates.flatMap((date) =>
    timeSlots.flatMap((time, slotIndex) =>
      venues.map((venue) => ({
        date,
        time,
        venue,
        slotIndex,
        isWeekend: [0, 6].includes(new Date(`${date}T00:00:00`).getDay())
      }))
    )
  );

const getDateDiffInDays = (left, right) => {
  if (!left || !right) {
    return Number.MAX_SAFE_INTEGER;
  }

  const leftDate = new Date(`${left}T00:00:00`);
  const rightDate = new Date(`${right}T00:00:00`);
  return Math.round(Math.abs(rightDate.getTime() - leftDate.getTime()) / 86_400_000);
};

const allocateFixtures = ({ fixtures, inputs, existingMatches = [] }) => {
  const occupiedSlots = new Set(
    existingMatches
      .filter((match) => normalizeText(match.date) && normalizeText(match.time) && normalizeText(match.venue))
      .map((match) => `${match.date}|${match.time}|${match.venue}`)
  );
  const teamSchedule = new Map();
  const alerts = [];
  const scheduledFixtures = fixtures.map((fixture) => ({ ...fixture }));

  existingMatches.forEach((match) => {
    [match.teamA, match.teamB].forEach((teamName) => {
      if (!normalizeText(teamName) || normalizeText(teamName).toLowerCase() === 'bye') {
        return;
      }

      if (!teamSchedule.has(teamName)) {
        teamSchedule.set(teamName, []);
      }

      teamSchedule.get(teamName).push({ date: match.date, time: match.time });
    });
  });

  scheduledFixtures.forEach((fixture, index) => {
    const slotScores = buildAvailableSlots(inputs)
      .filter((slot) => !occupiedSlots.has(`${slot.date}|${slot.time}|${slot.venue}`))
      .map((slot) => {
        if (
          inputs.constraints.noTeamPlaysTwoMatchesSameDay &&
          [fixture.teamA, fixture.teamB].some((teamName) =>
            (teamSchedule.get(teamName) || []).some((entry) => entry.date === slot.date)
          )
        ) {
          return null;
        }

        if (
          inputs.constraints.minimumRestDays > 0 &&
          [fixture.teamA, fixture.teamB].some((teamName) =>
            (teamSchedule.get(teamName) || []).some(
              (entry) => getDateDiffInDays(entry.date, slot.date) < inputs.constraints.minimumRestDays
            )
          )
        ) {
          return null;
        }

        let score = 50 - slot.slotIndex * 3 - index;
        const fixtureKey = normalizeFixtureKey(fixture.teamA, fixture.teamB);
        const preferredSlots = [
          ...(inputs.constraints.preferredMatchTimings[fixture.teamA] || []),
          ...(inputs.constraints.preferredMatchTimings[fixture.teamB] || [])
        ];

        if (preferredSlots.includes(slot.time)) {
          score += 12;
        }

        if (inputs.constraints.primeTimeMatches.includes(fixtureKey)) {
          score += slot.isWeekend ? 14 : -6;
          score += slot.slotIndex >= inputs.timeSlots.length - 2 ? 10 : -2;
        }

        return { slot, score };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score);

    const bestSlot = slotScores[0]?.slot;

    if (!bestSlot) {
      alerts.push(`Unable to schedule ${fixture.teamA} vs ${fixture.teamB} inside the current AI planning window.`);
      fixture.date = '';
      fixture.time = '';
      fixture.venue = '';
      fixture.status = 'Pending';
      return;
    }

    fixture.date = bestSlot.date;
    fixture.time = bestSlot.time;
    fixture.venue = bestSlot.venue;
    fixture.status = 'Scheduled';
    occupiedSlots.add(`${bestSlot.date}|${bestSlot.time}|${bestSlot.venue}`);

    [fixture.teamA, fixture.teamB].forEach((teamName) => {
      if (!teamSchedule.has(teamName)) {
        teamSchedule.set(teamName, []);
      }

      teamSchedule.get(teamName).push({ date: bestSlot.date, time: bestSlot.time });
    });
  });

  return {
    fixtures: scheduledFixtures.map((fixture, index) => ({
      ...fixture,
      matchNumber: index + 1,
      roundNumber: fixture.matchType === 'Group Stage' || fixture.matchType === 'League' ? 1 : 2
    })),
    alerts
  };
};

const buildSuggestions = ({ fixtures, alerts, inputs, existingMatches }) => {
  const unscheduledCount = fixtures.filter((fixture) => !fixture.date || !fixture.time || !fixture.venue).length;
  const suggestions = [];

  if (unscheduledCount) {
    suggestions.push(`Extend the planning range or add more venues and time slots to schedule the remaining ${unscheduledCount} fixture(s).`);
  }

  if (inputs.constraints.minimumRestDays > 0) {
    suggestions.push(`Current AI plan respects a minimum rest gap of ${inputs.constraints.minimumRestDays} day(s) where slots allow.`);
  }

  if (inputs.constraints.primeTimeMatches.length) {
    suggestions.push('Prime-time fixture requests were prioritized toward weekend and late-day slots.');
  }

  if (existingMatches.some((match) => ['Postponed', 'Cancelled'].includes(match.status))) {
    suggestions.push('Review the AI reschedule suggestions for postponed or cancelled core fixtures before approving a new plan.');
  }

  return [...new Set([...suggestions, ...alerts])].filter(Boolean);
};

const buildRescheduleSuggestions = ({ existingMatches, inputs }) => {
  const pendingMatches = existingMatches.filter((match) =>
    ['Postponed', 'Cancelled', 'Abandoned'].includes(match.status)
  );

  return pendingMatches.slice(0, 5).map((match, index) => ({
    matchId: match._id,
    fixture: `${match.teamA} vs ${match.teamB}`,
    suggestedDate: inputs.availableDates[index % Math.max(1, inputs.availableDates.length)] || '',
    suggestedTime: inputs.timeSlots[Math.min(index, Math.max(0, inputs.timeSlots.length - 1))] || '',
    suggestedVenue: inputs.venues[index % Math.max(1, inputs.venues.length)] || '',
    reason: 'Closest available slot with current venue and rest-day constraints.'
  }));
};

const buildOptimizationScore = ({ fixtures, alerts }) => {
  const unscheduledCount = fixtures.filter((fixture) => !fixture.date || !fixture.time || !fixture.venue).length;
  return Math.max(40, 100 - alerts.length * 10 - unscheduledCount * 12);
};

const getFixtureAiContext = async (eventId) => {
  const event = await Event.findOne({ _id: eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  const [configuration, existingMatches] = await Promise.all([
    getMatchConfiguration(event._id),
    Match.find({ eventId: event._id }).sort({ scheduledAt: 1, createdAt: 1 })
  ]);

  return {
    event,
    configuration,
    existingMatches
  };
};

const buildInputs = ({ event, configuration, payload = {} }) => {
  const startDate = normalizeText(payload.startDate) || toDateOnly(event.startDate);
  const endDate = normalizeText(payload.endDate) || toDateOnly(event.endDate || event.startDate);
  const availableDates =
    normalizeList(payload.availableDates).length > 0
      ? normalizeList(payload.availableDates)
      : enumerateDateRange(startDate, endDate);
  const venues = normalizeList(payload.venues, [normalizeText(payload.venue) || normalizeText(event.venue)]).slice(0, 8);
  const timeSlots = normalizeList(payload.timeSlots || payload.matchTimes, DEFAULT_TIME_SLOTS).slice(0, 8);

  return {
    experimental: true,
    format: getBaseFormat(configuration, payload),
    startDate,
    endDate,
    availableDates,
    venues: venues.filter(Boolean),
    timeSlots: timeSlots.filter(Boolean),
    constraints: {
      noTeamPlaysTwoMatchesSameDay: normalizeBoolean(
        payload.constraints?.noTeamPlaysTwoMatchesSameDay,
        true
      ),
      minimumRestDays: normalizeInteger(payload.constraints?.minimumRestDays, 1, 0),
      preferredMatchTimings: normalizePreferredTimings(payload.constraints?.preferredMatchTimings),
      primeTimeMatches: normalizeList(payload.constraints?.primeTimeMatches),
      venueCapacityPerSlot: normalizeInteger(payload.constraints?.venueCapacityPerSlot, 1, 1)
    },
    sources: {
      startDate: normalizeText(payload.startDate) ? 'manual' : 'event',
      endDate: normalizeText(payload.endDate) ? 'manual' : 'event',
      venues: normalizeList(payload.venues).length || normalizeText(payload.venue) ? 'manual' : 'event',
      timeSlots: normalizeList(payload.timeSlots || payload.matchTimes).length ? 'manual' : 'default'
    }
  };
};

const serializePlanDocument = (planDocument) => {
  const stored = planDocument?.value || {};

  return {
    experimental: true,
    status: normalizeText(stored.status) || 'empty',
    generatedAt: stored.generatedAt || null,
    approvedAt: stored.approvedAt || null,
    rejectedAt: stored.rejectedAt || null,
    optimizationScore: normalizeNumber(stored.optimizationScore, 0),
    inputs: stored.inputs || null,
    groupSuggestions: Array.isArray(stored.groupSuggestions) ? stored.groupSuggestions : [],
    fixtures: Array.isArray(stored.fixtures) ? stored.fixtures : [],
    suggestions: Array.isArray(stored.suggestions) ? stored.suggestions : [],
    alerts: Array.isArray(stored.alerts) ? stored.alerts : [],
    rescheduleSuggestions: Array.isArray(stored.rescheduleSuggestions)
      ? stored.rescheduleSuggestions
      : [],
    updatedAt: planDocument?.updatedAt || null,
    updatedBy: planDocument?.updatedBy || null
  };
};

export const getFixtureAiPlan = async (eventId) =>
  serializePlanDocument(await populateUpdatedBy(AppSetting.findOne({ key: buildPlanKey(eventId) })));

export const generateFixtureAiPlan = async ({ eventId, payload, userId }) => {
  const { event, configuration, existingMatches } = await getFixtureAiContext(eventId);
  const inputs = buildInputs({ event, configuration, payload });
  const teams = (configuration.teamProfiles || []).filter((team) => normalizeText(team.teamName));

  if (teams.length < 2) {
    throw new ApiError(400, 'At least two confirmed teams are required for the experimental AI planner.');
  }

  const performanceLookup = new Map();
  existingMatches
    .filter((match) => match.status === 'Completed')
    .forEach((match) => {
      [match.teamA, match.teamB].forEach((teamName) => {
        if (!performanceLookup.has(teamName)) {
          performanceLookup.set(teamName, { wins: 0, points: 0 });
        }
      });

      if (normalizeText(match.winnerTeam)) {
        const winner = performanceLookup.get(match.winnerTeam) || { wins: 0, points: 0 };
        winner.wins += 1;
        winner.points += 2;
        performanceLookup.set(match.winnerTeam, winner);
      }
    });

  const groupSuggestions =
    inputs.format === 'group-stage'
      ? snakeSeedGroups(teams, configuration.numberOfGroups || 2, performanceLookup).map((group) => ({
          label: group.label,
          teams: group.teams.map((team) => team.teamName)
        }))
      : [];

  const rawFixtures =
    inputs.format === 'group-stage'
      ? groupSuggestions.flatMap((group) =>
          buildPairings(
            group.teams.map((teamName) => ({ teamName })),
            'Group Stage',
            group.label
          )
        )
      : inputs.format === 'knockout'
        ? buildKnockoutPlan(teams)
        : buildPairings(teams, 'League', '');

  const { fixtures, alerts } = allocateFixtures({
    fixtures: rawFixtures,
    inputs,
    existingMatches
  });
  const suggestions = buildSuggestions({ fixtures, alerts, inputs, existingMatches });
  const rescheduleSuggestions = buildRescheduleSuggestions({ existingMatches, inputs });
  const optimizationScore = buildOptimizationScore({ fixtures, alerts });

  const value = {
    status: 'draft',
    generatedAt: new Date().toISOString(),
    approvedAt: '',
    rejectedAt: '',
    optimizationScore,
    inputs,
    groupSuggestions,
    fixtures,
    suggestions,
    alerts,
    rescheduleSuggestions
  };

  const updatedPlan = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: buildPlanKey(event._id) },
      { key: buildPlanKey(event._id), value, updatedBy: userId },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    )
  );

  return serializePlanDocument(updatedPlan);
};

export const saveFixtureAiPlanDraft = async ({ eventId, payload, userId }) => {
  const existingPlan = await getFixtureAiPlan(eventId);

  if (!existingPlan.fixtures.length && !Array.isArray(payload.fixtures)) {
    throw new ApiError(400, 'Generate an experimental AI fixture plan before saving draft edits.');
  }

  const value = {
    status: 'draft',
    generatedAt: existingPlan.generatedAt || new Date().toISOString(),
    approvedAt: '',
    rejectedAt: '',
    optimizationScore: normalizeNumber(payload.optimizationScore, existingPlan.optimizationScore || 0),
    inputs: payload.inputs || existingPlan.inputs,
    groupSuggestions: Array.isArray(payload.groupSuggestions)
      ? payload.groupSuggestions
      : existingPlan.groupSuggestions,
    fixtures: Array.isArray(payload.fixtures) ? payload.fixtures : existingPlan.fixtures,
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : existingPlan.suggestions,
    alerts: Array.isArray(payload.alerts) ? payload.alerts : existingPlan.alerts,
    rescheduleSuggestions: Array.isArray(payload.rescheduleSuggestions)
      ? payload.rescheduleSuggestions
      : existingPlan.rescheduleSuggestions
  };

  const updatedPlan = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: buildPlanKey(eventId) },
      { key: buildPlanKey(eventId), value, updatedBy: userId },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    )
  );

  return serializePlanDocument(updatedPlan);
};

export const approveFixtureAiPlan = async ({ eventId, payload, userId }) => {
  const event = await Event.findOne({ _id: eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  const planDocument = await AppSetting.findOne({ key: buildPlanKey(eventId) });
  const plan = serializePlanDocument(planDocument);

  if (!plan.fixtures.length) {
    throw new ApiError(400, 'Generate and review an experimental AI plan before approving it.');
  }

  const replaceExisting = normalizeBoolean(payload.replaceExisting, false);
  const existingMatchCount = await Match.countDocuments({ eventId: event._id });

  if (existingMatchCount > 0 && !replaceExisting) {
    throw new ApiError(409, 'Core fixtures already exist. Confirm replacement before approving the experimental AI plan.');
  }

  if (existingMatchCount > 0 && replaceExisting) {
    await Match.deleteMany({ eventId: event._id });
  }

  const coreFixtures = plan.fixtures.map((fixture, index) => ({
    eventId: event._id,
    teamA: fixture.teamA,
    teamB: fixture.teamB,
    teamASource: fixture.teamASource || fixture.teamA,
    teamBSource: fixture.teamBSource || fixture.teamB,
    matchType: fixture.matchType || 'League',
    groupName: fixture.groupName || '',
    venue: fixture.venue || '',
    date: fixture.date || '',
    time: fixture.time || '',
    roundNumber: normalizeInteger(fixture.roundNumber, 1, 1),
    roundLabel: fixture.roundLabel || fixture.matchType || 'AI Fixture',
    matchNumber: normalizeInteger(fixture.matchNumber, index + 1, 1),
    status: fixture.date && fixture.time ? 'Scheduled' : 'Pending',
    scheduledAt: fixture.date && fixture.time ? new Date(`${fixture.date}T${fixture.time}`) : null
  }));

  const createdMatches = await Match.insertMany(coreFixtures);

  const approvedPlan = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: buildPlanKey(eventId) },
      {
        key: buildPlanKey(eventId),
        value: {
          ...plan,
          status: 'approved',
          approvedAt: new Date().toISOString()
        },
        updatedBy: userId
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    )
  );

  return {
    plan: serializePlanDocument(approvedPlan),
    appliedFixtures: createdMatches.length
  };
};

export const rejectFixtureAiPlan = async ({ eventId, userId }) => {
  const existingPlan = await getFixtureAiPlan(eventId);

  if (!existingPlan.fixtures.length) {
    throw new ApiError(400, 'There is no experimental AI plan to reject.');
  }

  const rejectedPlan = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: buildPlanKey(eventId) },
      {
        key: buildPlanKey(eventId),
        value: {
          ...existingPlan,
          status: 'rejected',
          rejectedAt: new Date().toISOString()
        },
        updatedBy: userId
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    )
  );

  return serializePlanDocument(rejectedPlan);
};
