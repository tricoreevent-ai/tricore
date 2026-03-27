import { Event } from '../models/Event.js';
import { Match } from '../models/Match.js';
import { Registration } from '../models/Registration.js';
import {
  getMatchConfiguration,
  updateMatchConfiguration as saveMatchConfiguration
} from '../services/matchConfigurationService.js';
import { isPaymentConfirmed } from '../services/paymentStatusService.js';
import { serializeRegistrationRecord } from '../services/registrationViewService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const normalizeText = (value) => String(value || '').trim();

const normalizeNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const buildScheduledAt = (date, time) => {
  if (!date || !time) {
    return null;
  }

  const scheduledAt = new Date(`${date}T${time}`);
  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
};

const formatDatePart = (value) => {
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

const formatTimePart = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const buildScheduledSlot = (date, time, index, spacingMinutes = 120) => {
  const scheduledAt = buildScheduledAt(date, time);

  if (!scheduledAt) {
    return {
      date: normalizeText(date),
      time: normalizeText(time),
      scheduledAt: null
    };
  }

  const offsetDate = new Date(scheduledAt.getTime() + index * spacingMinutes * 60_000);

  return {
    date: formatDatePart(offsetDate),
    time: formatTimePart(offsetDate),
    scheduledAt: offsetDate
  };
};

const getRoundLabel = (matchCount, roundNumber) => {
  if (matchCount === 1) {
    return 'Final';
  }

  if (matchCount === 2) {
    return 'Semi Final';
  }

  if (matchCount === 4) {
    return 'Quarter Final';
  }

  return `Round ${roundNumber}`;
};

const getKnockoutMatchType = (matchCount) => {
  if (matchCount === 1) {
    return 'Final';
  }

  if (matchCount === 2) {
    return 'Semifinal';
  }

  if (matchCount === 4) {
    return 'Quarterfinal';
  }

  return 'Knockout';
};

const getConfirmedRegistrations = async (eventId) => {
  const registrations = await Registration.find({ eventId })
    .populate('paymentId', 'status confirmedAt')
    .sort({ createdAt: 1 });

  return registrations
    .map((registration) => serializeRegistrationRecord(registration))
    .filter(
      (registration) =>
        registration.status === 'Confirmed' || isPaymentConfirmed(registration.paymentId?.status)
    );
};

const toTeamOption = (registration) => ({
  registrationId: registration._id,
  teamName: registration.teamName || registration.name,
  captainName: registration.captainName || '',
  captainContact: registration.phone1 || registration.phone2 || registration.email || '',
  email: registration.email || '',
  phone1: registration.phone1 || '',
  phone2: registration.phone2 || '',
  players: Array.isArray(registration.players) ? registration.players : [],
  playerCount: Array.isArray(registration.players) ? registration.players.length : 0,
  confirmedAt: registration.confirmedAt || registration.paymentId?.confirmedAt || null,
  paymentStatus: registration.paymentId?.status || 'Pending'
});

const distributeTeamsIntoGroups = (teams = [], requestedGroupCount = 1) => {
  const safeTeamCount = teams.length;
  const groupCount = Math.max(1, Math.min(safeTeamCount || 1, Number(requestedGroupCount) || 1));
  const groups = Array.from({ length: groupCount }, (_item, index) => ({
    label: `Group ${String.fromCharCode(65 + index)}`,
    teams: []
  }));

  teams.forEach((team, index) => {
    groups[index % groupCount].teams.push(team);
  });

  return groups.filter((group) => group.teams.length);
};

const buildRoundRobinMatches = ({
  eventId,
  teams,
  date,
  time,
  venue,
  groupName = '',
  matchType = 'League',
  startingMatchNumber = 1,
  startingSlotIndex = 0
}) => {
  const matches = [];
  let matchNumber = startingMatchNumber;
  let slotIndex = startingSlotIndex;

  for (let leftIndex = 0; leftIndex < teams.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < teams.length; rightIndex += 1) {
      const scheduledSlot = buildScheduledSlot(date, time, slotIndex);

      matches.push({
        eventId,
        teamA: teams[leftIndex],
        teamB: teams[rightIndex],
        teamASource: teams[leftIndex],
        teamBSource: teams[rightIndex],
        matchType,
        groupName,
        venue: normalizeText(venue),
        date: scheduledSlot.date,
        time: scheduledSlot.time,
        roundNumber: 1,
        roundLabel: groupName || 'League Stage',
        matchNumber,
        status: scheduledSlot.scheduledAt ? 'Scheduled' : 'Pending',
        scheduledAt: scheduledSlot.scheduledAt
      });

      matchNumber += 1;
      slotIndex += 1;
    }
  }

  return {
    matches,
    nextMatchNumber: matchNumber,
    nextSlotIndex: slotIndex
  };
};

const buildKnockoutMatches = ({ eventId, teams, date, time, venue }) => {
  const bracketSize = 2 ** Math.ceil(Math.log2(teams.length));
  const seededTeams = [...teams];

  while (seededTeams.length < bracketSize) {
    seededTeams.push('BYE');
  }

  const matches = [];
  let roundParticipants = seededTeams.map((teamName) => ({ label: teamName }));
  let roundNumber = 1;
  let matchNumber = 1;

  while (roundParticipants.length > 1) {
    const roundMatchCount = roundParticipants.length / 2;
    const roundLabel = getRoundLabel(roundMatchCount, roundNumber);
    const matchType = getKnockoutMatchType(roundMatchCount);
    const nextRoundParticipants = [];

    for (let index = 0; index < roundParticipants.length; index += 2) {
      const teamAEntry = roundParticipants[index];
      const teamBEntry = roundParticipants[index + 1];
      const rawTeamA = teamAEntry?.label || 'BYE';
      const rawTeamB = teamBEntry?.label || 'BYE';
      const isByeMatch = rawTeamA === 'BYE' || rawTeamB === 'BYE';
      const winnerTeam = isByeMatch ? (rawTeamA === 'BYE' ? rawTeamB : rawTeamA) : '';
      const scheduledAt = roundNumber === 1 ? buildScheduledAt(date, time) : null;

      matches.push({
        eventId,
        teamA: rawTeamA === 'BYE' ? 'Bye' : rawTeamA,
        teamB: rawTeamB === 'BYE' ? 'Bye' : rawTeamB,
        teamASource: rawTeamA === 'BYE' ? '' : rawTeamA,
        teamBSource: rawTeamB === 'BYE' ? '' : rawTeamB,
        matchType,
        groupName: '',
        venue: roundNumber === 1 ? normalizeText(venue) : '',
        date: roundNumber === 1 ? normalizeText(date) : '',
        time: roundNumber === 1 ? normalizeText(time) : '',
        roundNumber,
        roundLabel,
        matchNumber,
        status: isByeMatch ? 'Bye' : roundNumber === 1 ? 'Scheduled' : 'Pending',
        winnerTeam,
        scheduledAt
      });

      nextRoundParticipants.push({
        label: winnerTeam || `Winner of Match ${matchNumber}`
      });

      matchNumber += 1;
    }

    roundParticipants = nextRoundParticipants;
    roundNumber += 1;
  }

  return matches;
};

const buildPlaceholderMatch = ({
  eventId,
  pairing,
  matchType,
  roundNumber,
  matchNumber,
  defaultVenue
}) => {
  const teamA = normalizeText(pairing.teamA) || `${matchType} Slot A`;
  const teamB = normalizeText(pairing.teamB) || `${matchType} Slot B`;
  const date = normalizeText(pairing.date);
  const time = normalizeText(pairing.time);
  const scheduledAt = buildScheduledAt(date, time);

  return {
    eventId,
    teamA,
    teamB,
    teamASource: normalizeText(pairing.teamA),
    teamBSource: normalizeText(pairing.teamB),
    matchType,
    groupName: '',
    venue: normalizeText(pairing.venue || defaultVenue),
    date,
    time,
    roundNumber,
    roundLabel: normalizeText(pairing.label) || matchType,
    matchNumber,
    status: scheduledAt ? 'Scheduled' : 'Pending',
    scheduledAt
  };
};

const buildKnockoutPlaceholderMatches = ({
  eventId,
  configuration,
  defaultVenue = '',
  startingMatchNumber = 1
}) => {
  const matches = [];
  let matchNumber = startingMatchNumber;
  let roundNumber = 2;

  const pushStage = (pairings, matchType) => {
    if (!Array.isArray(pairings) || !pairings.length) {
      return;
    }

    pairings.forEach((pairing) => {
      matches.push(
        buildPlaceholderMatch({
          eventId,
          pairing,
          matchType,
          roundNumber,
          matchNumber,
          defaultVenue
        })
      );
      matchNumber += 1;
    });

    roundNumber += 1;
  };

  if (configuration.quarterfinalsEnabled) {
    pushStage(configuration.quarterfinalPairings, 'Quarterfinal');
  }

  if (configuration.semifinalsEnabled) {
    pushStage(configuration.semifinalPairings, 'Semifinal');
  }

  if (configuration.finalEnabled) {
    pushStage(
      [
        {
          label: 'Final',
          teamA: configuration.finalMatch?.teamA,
          teamB: configuration.finalMatch?.teamB,
          date: configuration.finalMatch?.date,
          time: configuration.finalMatch?.time,
          venue: configuration.finalMatch?.venue
        }
      ],
      'Final'
    );
  }

  if (configuration.thirdPlaceMatchEnabled || configuration.thirdPlaceMatch?.enabled) {
    pushStage(
      [
        {
          label: 'Third Place Match',
          teamA: configuration.thirdPlaceMatch?.teamA,
          teamB: configuration.thirdPlaceMatch?.teamB,
          date: configuration.thirdPlaceMatch?.date,
          time: configuration.thirdPlaceMatch?.time,
          venue: configuration.thirdPlaceMatch?.venue
        }
      ],
      'Third Place'
    );
  }

  return matches;
};

const buildWinnerFromScores = (matchDocument, winnerTeam) => {
  const normalizedWinner = normalizeText(winnerTeam);

  if (normalizedWinner) {
    return normalizedWinner;
  }

  if (
    typeof matchDocument.teamAGoals === 'number' &&
    typeof matchDocument.teamBGoals === 'number' &&
    matchDocument.teamAGoals !== matchDocument.teamBGoals
  ) {
    return matchDocument.teamAGoals > matchDocument.teamBGoals ? matchDocument.teamA : matchDocument.teamB;
  }

  if (
    typeof matchDocument.teamARuns === 'number' &&
    typeof matchDocument.teamBRuns === 'number' &&
    matchDocument.teamARuns !== matchDocument.teamBRuns
  ) {
    return matchDocument.teamARuns > matchDocument.teamBRuns ? matchDocument.teamA : matchDocument.teamB;
  }

  return '';
};

export const getMatchConfigurationForEvent = asyncHandler(async (req, res) => {
  const configuration = await getMatchConfiguration(req.params.eventId);

  res.json({
    success: true,
    data: configuration
  });
});

export const saveMatchConfigurationForEvent = asyncHandler(async (req, res) => {
  const configuration = await saveMatchConfiguration({
    eventId: req.params.eventId,
    payload: req.body,
    userId: req.user._id
  });

  res.json({
    success: true,
    message: 'Match configuration updated successfully.',
    data: configuration
  });
});

export const getConfirmedTeamsByEvent = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ _id: req.params.eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  const registrations = await getConfirmedRegistrations(event._id);

  res.json({
    success: true,
    data: registrations.map(toTeamOption)
  });
});

export const createMatch = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ _id: req.body.eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  const confirmedTeams = await getConfirmedRegistrations(event._id);
  const allowedTeams = new Set(confirmedTeams.map((registration) => registration.teamName || registration.name));

  if (!allowedTeams.has(req.body.teamA) || !allowedTeams.has(req.body.teamB)) {
    throw new ApiError(400, 'Matches can only be created for payment-confirmed teams.');
  }

  const scheduledAt = buildScheduledAt(req.body.date, req.body.time);

  const match = await Match.create({
    ...req.body,
    venue: normalizeText(req.body.venue),
    date: normalizeText(req.body.date),
    time: normalizeText(req.body.time),
    roundNumber: Number(req.body.roundNumber || 1),
    roundLabel: String(req.body.roundLabel || getRoundLabel(0, Number(req.body.roundNumber || 1))).trim(),
    matchNumber: Number(req.body.matchNumber || 1),
    matchType: normalizeText(req.body.matchType) || 'League',
    groupName: normalizeText(req.body.groupName),
    officialName: normalizeText(req.body.officialName),
    officialRole: normalizeText(req.body.officialRole),
    status: scheduledAt ? 'Scheduled' : 'Pending',
    scheduledAt
  });

  res.status(201).json({
    success: true,
    data: match
  });
});

export const generateKnockoutBracket = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ _id: req.body.eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  const registrations = await getConfirmedRegistrations(event._id);
  const teams = registrations.map((registration) => registration.teamName || registration.name).filter(Boolean);

  if (teams.length < 2) {
    throw new ApiError(400, 'At least two confirmed teams are required to generate a knockout bracket.');
  }

  const existingMatchCount = await Match.countDocuments({ eventId: event._id });
  if (existingMatchCount > 0 && !req.body.replaceExisting) {
    throw new ApiError(409, 'Matches already exist for this event. Confirm replace to rebuild the bracket.');
  }

  if (existingMatchCount > 0 && req.body.replaceExisting) {
    await Match.deleteMany({ eventId: event._id });
  }

  const matches = buildKnockoutMatches({
    eventId: event._id,
    teams,
    date: req.body.date,
    time: req.body.time,
    venue: req.body.venue || event.venue || ''
  });

  const created = await Match.insertMany(matches);

  res.status(201).json({
    success: true,
    data: created
  });
});

export const autoGenerateFixtures = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ _id: req.body.eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  const registrations = await getConfirmedRegistrations(event._id);
  const teams = registrations.map((registration) => registration.teamName || registration.name).filter(Boolean);

  if (teams.length < 2) {
    throw new ApiError(400, 'At least two confirmed teams are required to generate fixtures.');
  }

  const existingMatchCount = await Match.countDocuments({ eventId: event._id });
  if (existingMatchCount > 0 && !req.body.replaceExisting) {
    throw new ApiError(409, 'Matches already exist for this event. Confirm replace to regenerate the fixture list.');
  }

  if (existingMatchCount > 0 && req.body.replaceExisting) {
    await Match.deleteMany({ eventId: event._id });
  }

  const configuration = await getMatchConfiguration(event._id);
  const defaultVenue = normalizeText(req.body.venue || event.venue || configuration.finalMatch?.venue);
  const generatedMatches = [];

  if (configuration.groupStageEnabled) {
    const groups = distributeTeamsIntoGroups(teams, configuration.numberOfGroups);
    let nextMatchNumber = 1;
    let nextSlotIndex = 0;

    groups.forEach((group) => {
      const groupFixtures = buildRoundRobinMatches({
        eventId: event._id,
        teams: group.teams,
        date: req.body.date,
        time: req.body.time,
        venue: defaultVenue,
        groupName: group.label,
        matchType: 'Group Stage',
        startingMatchNumber: nextMatchNumber,
        startingSlotIndex: nextSlotIndex
      });

      generatedMatches.push(...groupFixtures.matches);
      nextMatchNumber = groupFixtures.nextMatchNumber;
      nextSlotIndex = groupFixtures.nextSlotIndex;
    });

    if (configuration.knockoutStageEnabled) {
      generatedMatches.push(
        ...buildKnockoutPlaceholderMatches({
          eventId: event._id,
          configuration,
          defaultVenue,
          startingMatchNumber: generatedMatches.length + 1
        })
      );
    }
  } else if (configuration.knockoutStageEnabled) {
    generatedMatches.push(
      ...buildKnockoutMatches({
        eventId: event._id,
        teams,
        date: req.body.date,
        time: req.body.time,
        venue: defaultVenue
      })
    );
  } else {
    generatedMatches.push(
      ...buildRoundRobinMatches({
        eventId: event._id,
        teams,
        date: req.body.date,
        time: req.body.time,
        venue: defaultVenue,
        groupName: '',
        matchType: 'League',
        startingMatchNumber: 1,
        startingSlotIndex: 0
      }).matches
    );
  }

  const createdMatches = await Match.insertMany(generatedMatches);

  res.status(201).json({
    success: true,
    data: createdMatches
  });
});

export const updateMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.matchId);

  if (!match) {
    throw new ApiError(404, 'Match not found.');
  }

  if (match.resultLocked) {
    throw new ApiError(409, 'This match result has been finalized and can no longer be edited.');
  }

  const nextDate = normalizeText(req.body.date || match.date);
  const nextTime = normalizeText(req.body.time || match.time);
  const scheduledAt = buildScheduledAt(nextDate, nextTime);
  const nextTeamA = normalizeText(req.body.teamA || match.teamA);
  const nextTeamB = normalizeText(req.body.teamB || match.teamB);
  const requestedWinner = normalizeText(req.body.winnerTeam);

  if (requestedWinner && ![nextTeamA, nextTeamB].includes(requestedWinner)) {
    throw new ApiError(400, 'Match winner must match one of the participating teams.');
  }

  match.teamA = nextTeamA;
  match.teamB = nextTeamB;
  match.teamASource = normalizeText(req.body.teamASource || match.teamASource);
  match.teamBSource = normalizeText(req.body.teamBSource || match.teamBSource);
  match.matchType = normalizeText(req.body.matchType || match.matchType) || match.matchType;
  match.groupName = normalizeText(req.body.groupName || match.groupName);
  match.venue = normalizeText(req.body.venue || match.venue);
  match.date = nextDate;
  match.time = nextTime;
  match.roundNumber = Number(req.body.roundNumber || match.roundNumber || 1);
  match.roundLabel = normalizeText(req.body.roundLabel || match.roundLabel);
  match.matchNumber = Number(req.body.matchNumber || match.matchNumber || 1);
  match.officialName = normalizeText(req.body.officialName || match.officialName);
  match.officialRole = normalizeText(req.body.officialRole || match.officialRole);
  match.teamARuns = normalizeNullableNumber(req.body.teamARuns ?? match.teamARuns);
  match.teamAWickets = normalizeNullableNumber(req.body.teamAWickets ?? match.teamAWickets);
  match.teamAOvers = normalizeText(req.body.teamAOvers ?? match.teamAOvers);
  match.teamAGoals = normalizeNullableNumber(req.body.teamAGoals ?? match.teamAGoals);
  match.teamABonusPoints = Number(req.body.teamABonusPoints ?? match.teamABonusPoints ?? 0) || 0;
  match.teamBRuns = normalizeNullableNumber(req.body.teamBRuns ?? match.teamBRuns);
  match.teamBWickets = normalizeNullableNumber(req.body.teamBWickets ?? match.teamBWickets);
  match.teamBOvers = normalizeText(req.body.teamBOvers ?? match.teamBOvers);
  match.teamBGoals = normalizeNullableNumber(req.body.teamBGoals ?? match.teamBGoals);
  match.teamBBonusPoints = Number(req.body.teamBBonusPoints ?? match.teamBBonusPoints ?? 0) || 0;
  match.manOfTheMatch = normalizeText(req.body.manOfTheMatch ?? match.manOfTheMatch);
  match.resultNotes = normalizeText(req.body.resultNotes ?? match.resultNotes);
  match.cancellationReason = normalizeText(req.body.cancellationReason ?? match.cancellationReason);
  match.status = normalizeText(req.body.status || match.status) || match.status;
  match.scheduledAt = scheduledAt;
  match.winnerTeam = buildWinnerFromScores(match, requestedWinner);
  match.resultLocked = Boolean(req.body.resultLocked);

  if (match.status !== 'Completed') {
    match.winnerTeam = requestedWinner || match.winnerTeam;
  }

  await match.save();

  res.json({
    success: true,
    message: 'Match updated successfully.',
    data: match
  });
});

export const getMatchesByEvent = asyncHandler(async (req, res) => {
  const matches = await Match.find({ eventId: req.params.eventId }).sort({
    roundNumber: 1,
    matchNumber: 1,
    scheduledAt: 1
  });

  res.json({
    success: true,
    data: matches
  });
});
