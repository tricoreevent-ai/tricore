import { Registration } from '../models/Registration.js';
import { Event } from '../models/Event.js';
import { ApiError } from '../utils/ApiError.js';

const visibleEventCondition = {
  $or: [{ isHidden: false }, { isHidden: { $exists: false } }]
};

const getDeadlineCutoff = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(23, 59, 59, 999);
  return parsed;
};

export const getOpenEvent = async (eventId) => {
  const event = await Event.findOne({
    _id: eventId,
    isDeleted: false,
    ...visibleEventCondition
  });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  return event;
};

export const hasRegistrationStarted = (event, referenceDate = new Date()) => {
  if (event?.registrationStartDate) {
    return new Date(event.registrationStartDate) <= referenceDate;
  }

  if (event?.registrationDeadline) {
    return true;
  }

  return false;
};

export const hasRegistrationDeadlinePassed = (event, referenceDate = new Date()) => {
  const cutoff = getDeadlineCutoff(event?.registrationDeadline);
  return Boolean(cutoff) && cutoff < referenceDate;
};

export const isRegistrationOpenForEvent = (event, referenceDate = new Date()) =>
  Boolean(event?.registrationEnabled) &&
  hasRegistrationStarted(event, referenceDate) &&
  !hasRegistrationDeadlinePassed(event, referenceDate);

export const ensureRegistrationWindow = async (event) => {
  if (!event.registrationEnabled) {
    throw new ApiError(400, 'Registration is currently disabled for this event.');
  }

  if (!hasRegistrationStarted(event)) {
    throw new ApiError(400, 'Registration has not opened yet for this event.');
  }

  if (hasRegistrationDeadlinePassed(event)) {
    throw new ApiError(400, 'Registration deadline has passed for this event.');
  }

  const registrationCount = await Registration.countDocuments({ eventId: event._id });

  if (registrationCount >= event.maxParticipants) {
    throw new ApiError(400, 'This event has reached its registration limit.');
  }
};

export const normalizeRegistrationData = (payload) => ({
  name: payload.name?.trim() || '',
  teamName: payload.teamName?.trim() || undefined,
  captainName: payload.captainName?.trim() || undefined,
  email: payload.email.trim().toLowerCase(),
  phone1: payload.phone1.trim(),
  phone2: payload.phone2.trim(),
  address: payload.address.trim(),
  players: (payload.players || []).map((player) => ({
    name: player.name.trim(),
    phone: player.phone.trim(),
    address: player.address.trim()
  }))
});

export const validateRegistrationForEvent = (event, registration) => {
  const isTeamEvent = event.teamSize > 1;

  if (!isTeamEvent && !registration.name) {
    throw new ApiError(400, 'Participant name is required for individual events.');
  }

  if (isTeamEvent && !registration.teamName) {
    throw new ApiError(400, 'Team name is required for team events.');
  }

  if (event.sportType === 'Cricket') {
    if (!registration.teamName || !registration.captainName) {
      throw new ApiError(400, 'Cricket registrations require team and captain details.');
    }
  }

  if (registration.players.length > event.playerLimit) {
    throw new ApiError(
      400,
      `Player count cannot exceed the event limit of ${event.playerLimit}.`
    );
  }
};

export const ensureUniqueRegistration = async (eventId, registration) => {
  const duplicate = await Registration.findOne({
    eventId,
    $or: [
      { email: registration.email },
      ...(registration.teamName ? [{ teamName: registration.teamName }] : [])
    ]
  });

  if (duplicate) {
    throw new ApiError(409, 'A registration already exists for this email or team.');
  }
};
