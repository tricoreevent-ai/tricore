const normalizeText = (value) => String(value || '').trim();

const normalizeNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const getMatchFormatOptions = (sportType) => {
  const normalizedSportType = normalizeText(sportType).toLowerCase();

  if (normalizedSportType === 'football') {
    return [
      { value: '5-a-side', label: '5-a-side' },
      { value: '7-a-side', label: '7-a-side' },
      { value: '11-a-side', label: '11-a-side' }
    ];
  }

  if (normalizedSportType === 'cricket') {
    return [
      { value: 'T8', label: 'T8' },
      { value: 'T10', label: 'T10' },
      { value: 'T20', label: 'T20' }
    ];
  }

  return [{ value: 'Standard', label: 'Standard' }];
};

export const createInitialMatchConfiguration = (config = {}, event = null) => ({
  sportType: normalizeText(config.sportType || event?.sportType || 'Cricket'),
  matchFormat: normalizeText(config.matchFormat || 'T8'),
  numberOfTeams: normalizeNumber(config.numberOfTeams, event?.maxParticipants || 0),
  groupStageEnabled: Boolean(config.groupStageEnabled),
  numberOfGroups: normalizeNumber(config.numberOfGroups, 1),
  teamsPerGroup: normalizeNumber(config.teamsPerGroup, 1),
  knockoutStageEnabled: config.knockoutStageEnabled !== false,
  quarterfinalsEnabled: Boolean(config.quarterfinalsEnabled),
  semifinalsEnabled: config.semifinalsEnabled !== false,
  finalEnabled: config.finalEnabled !== false,
  thirdPlaceMatchEnabled: Boolean(config.thirdPlaceMatchEnabled),
  winPoints: normalizeNumber(config.winPoints, 2),
  drawPoints: normalizeNumber(config.drawPoints, 1),
  lossPoints: normalizeNumber(config.lossPoints, 0),
  bonusPoints: normalizeNumber(config.bonusPoints, 0),
  maxPlayersPerTeam: normalizeNumber(config.maxPlayersPerTeam, event?.playerLimit || event?.teamSize || 1),
  teamProfiles: Array.isArray(config.teamProfiles) ? config.teamProfiles : [],
  quarterfinalPairings: Array.isArray(config.quarterfinalPairings) ? config.quarterfinalPairings : [],
  semifinalPairings: Array.isArray(config.semifinalPairings) ? config.semifinalPairings : [],
  finalMatch: config.finalMatch || {},
  thirdPlaceMatch: config.thirdPlaceMatch || { enabled: false },
  notifySchedule: config.notifySchedule !== false,
  notifyResults: config.notifyResults !== false,
  notifyFixtureChanges: config.notifyFixtureChanges !== false
});

export const createInitialMatchForm = (eventId = '', venue = '') => ({
  eventId,
  teamA: '',
  teamB: '',
  date: '',
  time: '',
  venue: normalizeText(venue),
  matchType: 'League',
  groupName: '',
  officialName: '',
  officialRole: ''
});

export const createInitialFixtureBatchForm = (venue = '') => ({
  date: '',
  time: '',
  venue: normalizeText(venue)
});

export const createEditableMatchDraft = (match = {}) => ({
  _id: normalizeText(match._id),
  teamA: normalizeText(match.teamA),
  teamB: normalizeText(match.teamB),
  teamASource: normalizeText(match.teamASource),
  teamBSource: normalizeText(match.teamBSource),
  matchType: normalizeText(match.matchType || 'League'),
  groupName: normalizeText(match.groupName),
  venue: normalizeText(match.venue),
  date: normalizeText(match.date),
  time: normalizeText(match.time),
  roundNumber: normalizeNumber(match.roundNumber, 1),
  roundLabel: normalizeText(match.roundLabel),
  matchNumber: normalizeNumber(match.matchNumber, 1),
  officialName: normalizeText(match.officialName),
  officialRole: normalizeText(match.officialRole),
  status: normalizeText(match.status || 'Scheduled'),
  winnerTeam: normalizeText(match.winnerTeam),
  teamARuns: match.teamARuns ?? '',
  teamAWickets: match.teamAWickets ?? '',
  teamAOvers: normalizeText(match.teamAOvers),
  teamAGoals: match.teamAGoals ?? '',
  teamABonusPoints: normalizeNumber(match.teamABonusPoints, 0),
  teamBRuns: match.teamBRuns ?? '',
  teamBWickets: match.teamBWickets ?? '',
  teamBOvers: normalizeText(match.teamBOvers),
  teamBGoals: match.teamBGoals ?? '',
  teamBBonusPoints: normalizeNumber(match.teamBBonusPoints, 0),
  manOfTheMatch: normalizeText(match.manOfTheMatch),
  resultNotes: normalizeText(match.resultNotes),
  cancellationReason: normalizeText(match.cancellationReason),
  resultLocked: Boolean(match.resultLocked)
});

export const parseOversToDecimal = (value) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return 0;
  }

  const [overPart, ballPart] = normalizedValue.split('.');
  const overs = Number(overPart);
  const balls = Number(ballPart || 0);

  if (!Number.isFinite(overs) || !Number.isFinite(balls)) {
    return 0;
  }

  return overs + balls / 6;
};

export const computeMatchStandings = ({ matches = [], teams = [], configuration = {}, sportType = '' }) => {
  const normalizedSportType = normalizeText(sportType || configuration.sportType).toLowerCase();
  const standingsMap = new Map();
  const advanceCount = configuration.quarterfinalsEnabled
    ? 8
    : configuration.semifinalsEnabled
      ? 4
      : configuration.finalEnabled
        ? 2
        : 0;

  const ensureTeam = (teamName) => {
    const normalizedTeamName = normalizeText(teamName);

    if (!normalizedTeamName || normalizedTeamName.toLowerCase() === 'bye') {
      return null;
    }

    if (!standingsMap.has(normalizedTeamName)) {
      standingsMap.set(normalizedTeamName, {
        teamName: normalizedTeamName,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        bonusPoints: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        runsFor: 0,
        runsAgainst: 0,
        oversFaced: 0,
        oversBowled: 0,
        netRunRate: 0,
        qualificationStatus: 'In contention'
      });
    }

    return standingsMap.get(normalizedTeamName);
  };

  (Array.isArray(teams) ? teams : []).forEach((team) => {
    ensureTeam(team.teamName || team.name);
  });

  (Array.isArray(matches) ? matches : []).forEach((match) => {
    if (normalizeText(match.status).toLowerCase() !== 'completed') {
      return;
    }

    const teamA = ensureTeam(match.teamA);
    const teamB = ensureTeam(match.teamB);

    if (!teamA || !teamB) {
      return;
    }

    teamA.played += 1;
    teamB.played += 1;
    teamA.bonusPoints += normalizeNumber(match.teamABonusPoints, 0);
    teamB.bonusPoints += normalizeNumber(match.teamBBonusPoints, 0);
    teamA.points += normalizeNumber(match.teamABonusPoints, 0);
    teamB.points += normalizeNumber(match.teamBBonusPoints, 0);

    const winnerTeam = normalizeText(match.winnerTeam);

    if (winnerTeam && winnerTeam === teamA.teamName) {
      teamA.wins += 1;
      teamB.losses += 1;
      teamA.points += normalizeNumber(configuration.winPoints, 2);
      teamB.points += normalizeNumber(configuration.lossPoints, 0);
    } else if (winnerTeam && winnerTeam === teamB.teamName) {
      teamB.wins += 1;
      teamA.losses += 1;
      teamB.points += normalizeNumber(configuration.winPoints, 2);
      teamA.points += normalizeNumber(configuration.lossPoints, 0);
    } else {
      teamA.draws += 1;
      teamB.draws += 1;
      teamA.points += normalizeNumber(configuration.drawPoints, 1);
      teamB.points += normalizeNumber(configuration.drawPoints, 1);
    }

    if (normalizedSportType === 'football') {
      const teamAGoals = normalizeNumber(match.teamAGoals, 0);
      const teamBGoals = normalizeNumber(match.teamBGoals, 0);

      teamA.goalsFor += teamAGoals;
      teamA.goalsAgainst += teamBGoals;
      teamB.goalsFor += teamBGoals;
      teamB.goalsAgainst += teamAGoals;
      teamA.goalDifference = teamA.goalsFor - teamA.goalsAgainst;
      teamB.goalDifference = teamB.goalsFor - teamB.goalsAgainst;
    } else {
      const teamARuns = normalizeNumber(match.teamARuns, 0);
      const teamBRuns = normalizeNumber(match.teamBRuns, 0);
      const teamAOvers = parseOversToDecimal(match.teamAOvers);
      const teamBOvers = parseOversToDecimal(match.teamBOvers);

      teamA.runsFor += teamARuns;
      teamA.runsAgainst += teamBRuns;
      teamA.oversFaced += teamAOvers;
      teamA.oversBowled += teamBOvers;
      teamB.runsFor += teamBRuns;
      teamB.runsAgainst += teamARuns;
      teamB.oversFaced += teamBOvers;
      teamB.oversBowled += teamAOvers;
      teamA.netRunRate =
        (teamA.oversFaced ? teamA.runsFor / teamA.oversFaced : 0) -
        (teamA.oversBowled ? teamA.runsAgainst / teamA.oversBowled : 0);
      teamB.netRunRate =
        (teamB.oversFaced ? teamB.runsFor / teamB.oversFaced : 0) -
        (teamB.oversBowled ? teamB.runsAgainst / teamB.oversBowled : 0);
    }
  });

  const standings = [...standingsMap.values()].sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points;
    }

    if (normalizedSportType === 'football' && right.goalDifference !== left.goalDifference) {
      return right.goalDifference - left.goalDifference;
    }

    if (normalizedSportType !== 'football' && right.netRunRate !== left.netRunRate) {
      return right.netRunRate - left.netRunRate;
    }

    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }

    return left.teamName.localeCompare(right.teamName, 'en', {
      sensitivity: 'base',
      numeric: true
    });
  });

  return standings.map((row, index) => ({
    ...row,
    rank: index + 1,
    qualificationStatus:
      advanceCount && index < advanceCount ? 'Qualified' : row.played ? 'In contention' : 'Awaiting fixtures'
  }));
};

export const sortMatchesBySchedule = (matches = []) =>
  [...(Array.isArray(matches) ? matches : [])].sort((left, right) => {
    const leftTimestamp = left?.scheduledAt ? new Date(left.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTimestamp = right?.scheduledAt ? new Date(right.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;

    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp - rightTimestamp;
    }

    return normalizeText(left.roundLabel).localeCompare(normalizeText(right.roundLabel), 'en', {
      sensitivity: 'base',
      numeric: true
    });
  });

export const groupMatchesByCalendarDate = (matches = []) => {
  const grouped = sortMatchesBySchedule(matches).reduce((accumulator, match) => {
    const key = normalizeText(match.date) || 'Unscheduled';

    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(match);
    return accumulator;
  }, {});

  return Object.entries(grouped).map(([date, items]) => ({
    date,
    items
  }));
};
