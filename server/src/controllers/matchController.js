import { Event } from '../models/Event.js';
import { Match } from '../models/Match.js';
import { Registration } from '../models/Registration.js';
import { isPaymentConfirmed } from '../services/paymentStatusService.js';
import { serializeRegistrationRecord } from '../services/registrationViewService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const buildScheduledAt = (date, time) => {
  if (!date || !time) {
    return null;
  }

  const scheduledAt = new Date(`${date}T${time}`);
  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
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
  playerCount: Array.isArray(registration.players) ? registration.players.length : 0,
  confirmedAt: registration.confirmedAt || registration.paymentId?.confirmedAt || null,
  paymentStatus: registration.paymentId?.status || 'Pending'
});

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
        venue: roundNumber === 1 ? venue : '',
        date: roundNumber === 1 ? date : '',
        time: roundNumber === 1 ? time : '',
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
    roundNumber: Number(req.body.roundNumber || 1),
    roundLabel: String(req.body.roundLabel || getRoundLabel(0, Number(req.body.roundNumber || 1))).trim(),
    matchNumber: Number(req.body.matchNumber || 1),
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

export const getMatchesByEvent = asyncHandler(async (req, res) => {
  const matches = await Match.find({ eventId: req.params.eventId }).sort({ roundNumber: 1, matchNumber: 1, scheduledAt: 1 });

  res.json({
    success: true,
    data: matches
  });
});
