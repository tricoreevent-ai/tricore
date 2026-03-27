import { randomUUID } from 'node:crypto';

import { AppSetting } from '../models/AppSetting.js';
import { Event } from '../models/Event.js';
import { Registration } from '../models/Registration.js';
import { isPaymentConfirmed } from './paymentStatusService.js';
import { serializeRegistrationRecord } from './registrationViewService.js';
import { isImageDataUrl, persistImageReference } from './imageStorageService.js';
import { ApiError } from '../utils/ApiError.js';

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');
const MATCH_CONFIG_KEY_PREFIX = 'match-config';
const TEAM_LOGO_IMAGE_OPTIONS = {
  folder: 'team-logos',
  filenamePrefix: 'team-logo',
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 72
};
const PLAYER_PHOTO_IMAGE_OPTIONS = {
  folder: 'player-photos',
  filenamePrefix: 'player-photo',
  maxWidth: 900,
  maxHeight: 900,
  quality: 72
};

const normalizeText = (value) => String(value || '').trim();

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
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

const getConfigKey = (eventId) => `${MATCH_CONFIG_KEY_PREFIX}:${String(eventId || '').trim()}`;

const getDefaultMatchFormat = (sportType) => {
  const normalizedSportType = normalizeText(sportType).toLowerCase();

  if (normalizedSportType === 'football') {
    return '7-a-side';
  }

  if (normalizedSportType === 'cricket') {
    return 'T8';
  }

  return 'Standard';
};

const getDefaultQuarterfinalPairings = () => [
  {
    id: randomUUID(),
    label: 'Quarterfinal 1',
    teamA: 'Group A Winner',
    teamB: 'Group B Runner-up',
    date: '',
    time: '',
    venue: ''
  },
  {
    id: randomUUID(),
    label: 'Quarterfinal 2',
    teamA: 'Group B Winner',
    teamB: 'Group A Runner-up',
    date: '',
    time: '',
    venue: ''
  },
  {
    id: randomUUID(),
    label: 'Quarterfinal 3',
    teamA: 'Group C Winner',
    teamB: 'Group D Runner-up',
    date: '',
    time: '',
    venue: ''
  },
  {
    id: randomUUID(),
    label: 'Quarterfinal 4',
    teamA: 'Group D Winner',
    teamB: 'Group C Runner-up',
    date: '',
    time: '',
    venue: ''
  }
];

const getDefaultSemifinalPairings = () => [
  {
    id: randomUUID(),
    label: 'Semifinal 1',
    teamA: 'Winner Quarterfinal 1',
    teamB: 'Winner Quarterfinal 2',
    date: '',
    time: '',
    venue: ''
  },
  {
    id: randomUUID(),
    label: 'Semifinal 2',
    teamA: 'Winner Quarterfinal 3',
    teamB: 'Winner Quarterfinal 4',
    date: '',
    time: '',
    venue: ''
  }
];

const getDefaultFinalMatch = (venue) => ({
  teamA: 'Winner Semifinal 1',
  teamB: 'Winner Semifinal 2',
  date: '',
  time: '',
  venue: normalizeText(venue)
});

const getDefaultThirdPlaceMatch = (venue) => ({
  enabled: false,
  teamA: 'Loser Semifinal 1',
  teamB: 'Loser Semifinal 2',
  date: '',
  time: '',
  venue: normalizeText(venue)
});

const toTeamProfilePlayer = (player = {}, index = 0) => ({
  id: normalizeText(player.id) || randomUUID(),
  name: normalizeText(player.name) || `Player ${index + 1}`,
  role: normalizeText(player.role),
  jerseyNumber: normalizeText(player.jerseyNumber),
  photoUrl: normalizeText(player.photoUrl),
  phone: normalizeText(player.phone),
  address: normalizeText(player.address)
});

const buildPlayerLookupKey = (player = {}, index = 0) =>
  normalizeText(player.name).toLowerCase() || `${index}`;

const mergePlayers = (defaultPlayers = [], storedPlayers = []) => {
  const storedByKey = new Map(
    (Array.isArray(storedPlayers) ? storedPlayers : []).map((player, index) => [
      buildPlayerLookupKey(player, index),
      player
    ])
  );

  const mergedPlayers = defaultPlayers.map((player, index) => {
    const storedPlayer = storedByKey.get(buildPlayerLookupKey(player, index)) || {};
    return {
      ...player,
      role: normalizeText(storedPlayer.role || player.role),
      jerseyNumber: normalizeText(storedPlayer.jerseyNumber || player.jerseyNumber),
      photoUrl: normalizeText(storedPlayer.photoUrl || player.photoUrl)
    };
  });

  const additionalPlayers = (Array.isArray(storedPlayers) ? storedPlayers : [])
    .filter((player, index) => !defaultPlayers.some((item, itemIndex) =>
      buildPlayerLookupKey(item, itemIndex) === buildPlayerLookupKey(player, index)
    ))
    .map((player, index) => toTeamProfilePlayer(player, index));

  return [...mergedPlayers, ...additionalPlayers];
};

const buildDefaultTeamProfile = (registration) => ({
  id: normalizeText(registration.registrationId || registration._id) || randomUUID(),
  registrationId: normalizeText(registration.registrationId || registration._id),
  teamName: normalizeText(registration.teamName || registration.name) || 'Unnamed Team',
  captainName: normalizeText(registration.captainName),
  captainContact:
    normalizeText(registration.phone1) ||
    normalizeText(registration.phone2) ||
    normalizeText(registration.email),
  email: normalizeText(registration.email),
  phone1: normalizeText(registration.phone1),
  phone2: normalizeText(registration.phone2),
  teamLogoUrl: '',
  players: Array.isArray(registration.players)
    ? registration.players.map((player, index) =>
        toTeamProfilePlayer(
          {
            ...player,
            phone: player.phone,
            address: player.address
          },
          index
        )
      )
    : []
});

const mergeTeamProfiles = (defaultProfiles = [], storedProfiles = []) => {
  const storedByTeamName = new Map(
    (Array.isArray(storedProfiles) ? storedProfiles : []).map((profile) => [
      normalizeText(profile.teamName).toLowerCase(),
      profile
    ])
  );

  const mergedProfiles = defaultProfiles.map((profile) => {
    const storedProfile = storedByTeamName.get(normalizeText(profile.teamName).toLowerCase()) || {};
    return {
      ...profile,
      captainName: normalizeText(storedProfile.captainName || profile.captainName),
      captainContact: normalizeText(storedProfile.captainContact || profile.captainContact),
      email: normalizeText(storedProfile.email || profile.email),
      phone1: normalizeText(storedProfile.phone1 || profile.phone1),
      phone2: normalizeText(storedProfile.phone2 || profile.phone2),
      teamLogoUrl: normalizeText(storedProfile.teamLogoUrl || profile.teamLogoUrl),
      players: mergePlayers(profile.players, storedProfile.players)
    };
  });

  const additionalProfiles = (Array.isArray(storedProfiles) ? storedProfiles : [])
    .filter(
      (profile) =>
        !defaultProfiles.some(
          (item) =>
            normalizeText(item.teamName).toLowerCase() === normalizeText(profile.teamName).toLowerCase()
        )
    )
    .map((profile) => ({
      id: normalizeText(profile.id) || randomUUID(),
      registrationId: normalizeText(profile.registrationId),
      teamName: normalizeText(profile.teamName) || 'Custom Team',
      captainName: normalizeText(profile.captainName),
      captainContact: normalizeText(profile.captainContact),
      email: normalizeText(profile.email),
      phone1: normalizeText(profile.phone1),
      phone2: normalizeText(profile.phone2),
      teamLogoUrl: normalizeText(profile.teamLogoUrl),
      players: Array.isArray(profile.players)
        ? profile.players.map((player, index) => toTeamProfilePlayer(player, index))
        : []
    }));

  return [...mergedProfiles, ...additionalProfiles];
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

const buildDefaultConfiguration = ({ event, confirmedRegistrations }) => {
  const teamCount = confirmedRegistrations.length || normalizeInteger(event.maxParticipants, 0, 0);
  const defaultProfiles = confirmedRegistrations.map(buildDefaultTeamProfile);
  const defaultGroupCount = teamCount >= 8 ? 4 : teamCount >= 4 ? 2 : 1;

  return {
    sportType: normalizeText(event.sportType),
    matchFormat: getDefaultMatchFormat(event.sportType),
    numberOfTeams: teamCount,
    groupStageEnabled: teamCount >= 6,
    numberOfGroups: defaultGroupCount,
    teamsPerGroup: defaultGroupCount ? Math.max(1, Math.ceil(teamCount / defaultGroupCount)) : teamCount,
    knockoutStageEnabled: true,
    quarterfinalsEnabled: teamCount >= 8,
    semifinalsEnabled: teamCount >= 4,
    finalEnabled: true,
    thirdPlaceMatchEnabled: false,
    winPoints: normalizeText(event.sportType).toLowerCase() === 'football' ? 3 : 2,
    drawPoints: 1,
    lossPoints: 0,
    bonusPoints: 0,
    maxPlayersPerTeam: normalizeInteger(event.playerLimit || event.teamSize, 0, 1),
    teamProfiles: defaultProfiles,
    quarterfinalPairings: getDefaultQuarterfinalPairings(),
    semifinalPairings: getDefaultSemifinalPairings(),
    finalMatch: getDefaultFinalMatch(event.venue),
    thirdPlaceMatch: getDefaultThirdPlaceMatch(event.venue),
    notifySchedule: true,
    notifyResults: true,
    notifyFixtureChanges: true
  };
};

const normalizePairings = (pairings = [], fallbackPairings = [], defaultVenue = '') => {
  const source = Array.isArray(pairings) && pairings.length ? pairings : fallbackPairings;

  return source.map((pairing, index) => ({
    id: normalizeText(pairing.id) || randomUUID(),
    label: normalizeText(pairing.label) || fallbackPairings[index]?.label || `Pairing ${index + 1}`,
    teamA: normalizeText(pairing.teamA || pairing.teamAInput || pairing.teamASeed),
    teamB: normalizeText(pairing.teamB || pairing.teamBInput || pairing.teamBSeed),
    date: normalizeText(pairing.date),
    time: normalizeText(pairing.time),
    venue: normalizeText(pairing.venue || defaultVenue)
  }));
};

const normalizeFinalMatch = (match = {}, fallback = {}, defaultVenue = '') => ({
  teamA: normalizeText(match.teamA || fallback.teamA),
  teamB: normalizeText(match.teamB || fallback.teamB),
  date: normalizeText(match.date || fallback.date),
  time: normalizeText(match.time || fallback.time),
  venue: normalizeText(match.venue || fallback.venue || defaultVenue)
});

const normalizeThirdPlaceMatch = (match = {}, fallback = {}, defaultVenue = '') => ({
  enabled: normalizeBoolean(match.enabled, fallback.enabled),
  teamA: normalizeText(match.teamA || fallback.teamA),
  teamB: normalizeText(match.teamB || fallback.teamB),
  date: normalizeText(match.date || fallback.date),
  time: normalizeText(match.time || fallback.time),
  venue: normalizeText(match.venue || fallback.venue || defaultVenue)
});

const persistImageValue = async (value, options) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || !isImageDataUrl(normalizedValue)) {
    return normalizedValue;
  }

  return persistImageReference(normalizedValue, options);
};

const normalizeTeamProfiles = async (profiles = [], fallbackProfiles = []) =>
  Promise.all(
    mergeTeamProfiles(fallbackProfiles, profiles).map(async (profile) => ({
      id: normalizeText(profile.id) || randomUUID(),
      registrationId: normalizeText(profile.registrationId),
      teamName: normalizeText(profile.teamName) || 'Unnamed Team',
      captainName: normalizeText(profile.captainName),
      captainContact: normalizeText(profile.captainContact),
      email: normalizeText(profile.email),
      phone1: normalizeText(profile.phone1),
      phone2: normalizeText(profile.phone2),
      teamLogoUrl: await persistImageValue(profile.teamLogoUrl, TEAM_LOGO_IMAGE_OPTIONS),
      players: await Promise.all(
        (Array.isArray(profile.players) ? profile.players : []).map(async (player, index) => ({
          ...toTeamProfilePlayer(player, index),
          photoUrl: await persistImageValue(player.photoUrl, PLAYER_PHOTO_IMAGE_OPTIONS)
        }))
      )
    }))
  );

const serializeMatchConfiguration = ({ event, settingDocument, defaultConfiguration }) => {
  const stored = settingDocument?.value || {};
  const teamProfiles = mergeTeamProfiles(defaultConfiguration.teamProfiles, stored.teamProfiles);

  return {
    sportType: normalizeText(event.sportType),
    matchFormat: normalizeText(stored.matchFormat || defaultConfiguration.matchFormat),
    numberOfTeams: normalizeInteger(stored.numberOfTeams, defaultConfiguration.numberOfTeams, 0),
    groupStageEnabled: normalizeBoolean(
      stored.groupStageEnabled,
      defaultConfiguration.groupStageEnabled
    ),
    numberOfGroups: normalizeInteger(stored.numberOfGroups, defaultConfiguration.numberOfGroups, 1),
    teamsPerGroup: normalizeInteger(stored.teamsPerGroup, defaultConfiguration.teamsPerGroup, 1),
    knockoutStageEnabled: normalizeBoolean(
      stored.knockoutStageEnabled,
      defaultConfiguration.knockoutStageEnabled
    ),
    quarterfinalsEnabled: normalizeBoolean(
      stored.quarterfinalsEnabled,
      defaultConfiguration.quarterfinalsEnabled
    ),
    semifinalsEnabled: normalizeBoolean(stored.semifinalsEnabled, defaultConfiguration.semifinalsEnabled),
    finalEnabled: normalizeBoolean(stored.finalEnabled, defaultConfiguration.finalEnabled),
    thirdPlaceMatchEnabled: normalizeBoolean(
      stored.thirdPlaceMatchEnabled,
      defaultConfiguration.thirdPlaceMatchEnabled
    ),
    winPoints: normalizeNumber(stored.winPoints, defaultConfiguration.winPoints),
    drawPoints: normalizeNumber(stored.drawPoints, defaultConfiguration.drawPoints),
    lossPoints: normalizeNumber(stored.lossPoints, defaultConfiguration.lossPoints),
    bonusPoints: normalizeNumber(stored.bonusPoints, defaultConfiguration.bonusPoints),
    maxPlayersPerTeam: normalizeInteger(
      stored.maxPlayersPerTeam,
      defaultConfiguration.maxPlayersPerTeam,
      1
    ),
    teamProfiles,
    quarterfinalPairings: normalizePairings(
      stored.quarterfinalPairings,
      defaultConfiguration.quarterfinalPairings,
      event.venue
    ),
    semifinalPairings: normalizePairings(
      stored.semifinalPairings,
      defaultConfiguration.semifinalPairings,
      event.venue
    ),
    finalMatch: normalizeFinalMatch(stored.finalMatch, defaultConfiguration.finalMatch, event.venue),
    thirdPlaceMatch: normalizeThirdPlaceMatch(
      stored.thirdPlaceMatch,
      defaultConfiguration.thirdPlaceMatch,
      event.venue
    ),
    notifySchedule: normalizeBoolean(stored.notifySchedule, defaultConfiguration.notifySchedule),
    notifyResults: normalizeBoolean(stored.notifyResults, defaultConfiguration.notifyResults),
    notifyFixtureChanges: normalizeBoolean(
      stored.notifyFixtureChanges,
      defaultConfiguration.notifyFixtureChanges
    ),
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesDefaults: !settingDocument
  };
};

const getEventWithValidation = async (eventId) => {
  const event = await Event.findOne({ _id: eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  return event;
};

export const getMatchConfiguration = async (eventId) => {
  const event = await getEventWithValidation(eventId);
  const confirmedRegistrations = await getConfirmedRegistrations(event._id);
  const defaultConfiguration = buildDefaultConfiguration({
    event,
    confirmedRegistrations
  });
  const settingDocument = await populateUpdatedBy(AppSetting.findOne({ key: getConfigKey(event._id) }));

  return serializeMatchConfiguration({
    event,
    settingDocument,
    defaultConfiguration
  });
};

export const updateMatchConfiguration = async ({ eventId, payload, userId }) => {
  const event = await getEventWithValidation(eventId);
  const confirmedRegistrations = await getConfirmedRegistrations(event._id);
  const defaultConfiguration = buildDefaultConfiguration({
    event,
    confirmedRegistrations
  });
  const nextValue = {
    matchFormat: normalizeText(payload.matchFormat || defaultConfiguration.matchFormat),
    numberOfTeams: normalizeInteger(payload.numberOfTeams, defaultConfiguration.numberOfTeams, 0),
    groupStageEnabled: normalizeBoolean(
      payload.groupStageEnabled,
      defaultConfiguration.groupStageEnabled
    ),
    numberOfGroups: normalizeInteger(payload.numberOfGroups, defaultConfiguration.numberOfGroups, 1),
    teamsPerGroup: normalizeInteger(payload.teamsPerGroup, defaultConfiguration.teamsPerGroup, 1),
    knockoutStageEnabled: normalizeBoolean(
      payload.knockoutStageEnabled,
      defaultConfiguration.knockoutStageEnabled
    ),
    quarterfinalsEnabled: normalizeBoolean(
      payload.quarterfinalsEnabled,
      defaultConfiguration.quarterfinalsEnabled
    ),
    semifinalsEnabled: normalizeBoolean(payload.semifinalsEnabled, defaultConfiguration.semifinalsEnabled),
    finalEnabled: normalizeBoolean(payload.finalEnabled, defaultConfiguration.finalEnabled),
    thirdPlaceMatchEnabled: normalizeBoolean(
      payload.thirdPlaceMatchEnabled,
      defaultConfiguration.thirdPlaceMatchEnabled
    ),
    winPoints: normalizeNumber(payload.winPoints, defaultConfiguration.winPoints),
    drawPoints: normalizeNumber(payload.drawPoints, defaultConfiguration.drawPoints),
    lossPoints: normalizeNumber(payload.lossPoints, defaultConfiguration.lossPoints),
    bonusPoints: normalizeNumber(payload.bonusPoints, defaultConfiguration.bonusPoints),
    maxPlayersPerTeam: normalizeInteger(
      payload.maxPlayersPerTeam,
      defaultConfiguration.maxPlayersPerTeam,
      1
    ),
    teamProfiles: await normalizeTeamProfiles(payload.teamProfiles, defaultConfiguration.teamProfiles),
    quarterfinalPairings: normalizePairings(
      payload.quarterfinalPairings,
      defaultConfiguration.quarterfinalPairings,
      event.venue
    ),
    semifinalPairings: normalizePairings(
      payload.semifinalPairings,
      defaultConfiguration.semifinalPairings,
      event.venue
    ),
    finalMatch: normalizeFinalMatch(payload.finalMatch, defaultConfiguration.finalMatch, event.venue),
    thirdPlaceMatch: normalizeThirdPlaceMatch(
      payload.thirdPlaceMatch,
      defaultConfiguration.thirdPlaceMatch,
      event.venue
    ),
    notifySchedule: normalizeBoolean(payload.notifySchedule, defaultConfiguration.notifySchedule),
    notifyResults: normalizeBoolean(payload.notifyResults, defaultConfiguration.notifyResults),
    notifyFixtureChanges: normalizeBoolean(
      payload.notifyFixtureChanges,
      defaultConfiguration.notifyFixtureChanges
    )
  };

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: getConfigKey(event._id) },
      {
        key: getConfigKey(event._id),
        value: nextValue,
        updatedBy: userId
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    )
  );

  return serializeMatchConfiguration({
    event,
    settingDocument: updated,
    defaultConfiguration
  });
};
