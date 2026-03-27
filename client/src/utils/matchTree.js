import { sortMatchesBySchedule } from './matchAdmin.js';

const normalizeText = (value) => String(value || '').trim();

const KNOCKOUT_MATCH_TYPES = new Set([
  'quarterfinal',
  'semifinal',
  'final',
  'third place',
  'knockout'
]);

const MATCH_TONE_BY_TYPE = {
  league: 'matchLeague',
  'group stage': 'matchLeague',
  quarterfinal: 'matchKnockout',
  semifinal: 'matchKnockout',
  final: 'matchFinal',
  'third place': 'matchFinal',
  knockout: 'matchKnockout'
};

const stagePriority = (match = {}) => {
  const stageLabel = normalizeText(match.roundLabel || match.matchType).toLowerCase();

  if (stageLabel.includes('final') && !stageLabel.includes('semi') && !stageLabel.includes('quarter')) {
    return 60;
  }

  if (stageLabel.includes('third place')) {
    return 55;
  }

  if (stageLabel.includes('semi')) {
    return 50;
  }

  if (stageLabel.includes('quarter')) {
    return 45;
  }

  if (stageLabel.includes('knockout')) {
    return 40;
  }

  if (stageLabel.includes('group')) {
    return 20;
  }

  if (stageLabel.includes('league')) {
    return 10;
  }

  return Number(match.roundNumber || 0);
};

const pluralize = (count, label) => `${count} ${label}${count === 1 ? '' : 's'}`;

const truncate = (value, maxLength = 42) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 1)}…`;
};

const getMatchLabel = (match = {}) =>
  normalizeText(match.roundLabel || match.matchType || `Match ${match.matchNumber || ''}`) ||
  'Fixture';

const getFixtureTitle = (match = {}) =>
  truncate(`${match.teamA || 'Team A'} vs ${match.teamB || 'Team B'}`, 34) || 'Fixture pending';

const getCompactScheduleLabel = (match = {}) => {
  const dateLabel = normalizeText(match.date);
  const timeLabel = normalizeText(match.time);
  const venueLabel = normalizeText(match.venue);
  const dateTimeLabel = [dateLabel, timeLabel].filter(Boolean).join(' • ');

  if (dateTimeLabel && venueLabel) {
    return `${dateTimeLabel} • ${truncate(venueLabel, 18)}`;
  }

  return dateTimeLabel || venueLabel || 'Schedule pending';
};

const getMatchTone = (match = {}) => {
  const normalizedStatus = normalizeText(match.status).toLowerCase();

  if (normalizedStatus === 'completed') {
    return 'matchCompleted';
  }

  if (['postponed', 'abandoned', 'cancelled'].includes(normalizedStatus)) {
    return 'matchWarning';
  }

  const normalizedType = normalizeText(match.matchType).toLowerCase();
  return MATCH_TONE_BY_TYPE[normalizedType] || 'matchLeague';
};

const createTeamLeafNode = (label, fallbackLabel = '') => {
  const normalizedLabel = normalizeText(label) || normalizeText(fallbackLabel) || 'Slot pending';
  const currentLabel =
    normalizeText(fallbackLabel) && normalizeText(fallbackLabel) !== normalizedLabel
      ? `Current slot: ${truncate(fallbackLabel, 24)}`
      : '';

  return {
    name: truncate(normalizedLabel, 26) || 'Slot pending',
    tone: /group|runner-up|winner|loser|slot|bye/i.test(normalizedLabel) ? 'seed' : 'team',
    details: currentLabel ? [currentLabel] : [],
    children: []
  };
};

const normalizeReferenceKey = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

const buildAliasMap = (matches = []) => {
  const aliases = new Map();

  const addAlias = (alias, match) => {
    const key = normalizeReferenceKey(alias);

    if (key && !aliases.has(key)) {
      aliases.set(key, match);
    }
  };

  (Array.isArray(matches) ? matches : []).forEach((match) => {
    addAlias(match.roundLabel, match);
    addAlias(match.matchType, match);
    addAlias(`Match ${match.matchNumber}`, match);
  });

  return aliases;
};

const resolveSourceReference = (source, aliasMap) => {
  const normalizedSource = normalizeText(source);

  if (!normalizedSource) {
    return null;
  }

  const exactMatch = aliasMap.get(normalizeReferenceKey(normalizedSource));

  if (exactMatch) {
    return exactMatch;
  }

  const strippedSource = normalizedSource.replace(/^(winner|loser)(?:\s+of)?\s+/i, '').trim();
  return aliasMap.get(normalizeReferenceKey(strippedSource)) || null;
};

const hasDependencySource = (value) => /winner|loser|match\s+\d+/i.test(normalizeText(value));

const isDependencyCandidate = (match = {}) =>
  KNOCKOUT_MATCH_TYPES.has(normalizeText(match.matchType).toLowerCase()) ||
  Number(match.roundNumber || 0) > 1 ||
  hasDependencySource(match.teamASource) ||
  hasDependencySource(match.teamBSource);

const buildStageTreeNodes = (matches = []) => {
  const stageMap = sortMatchesBySchedule(matches).reduce((accumulator, match) => {
    const stageKey = getMatchLabel(match);

    if (!accumulator.has(stageKey)) {
      accumulator.set(stageKey, []);
    }

    accumulator.get(stageKey).push(match);
    return accumulator;
  }, new Map());

  return [...stageMap.entries()]
    .sort((left, right) => {
      const leftSample = left[1]?.[0] || {};
      const rightSample = right[1]?.[0] || {};
      const priorityDelta = stagePriority(rightSample) - stagePriority(leftSample);

      if (priorityDelta) {
        return priorityDelta;
      }

      return left[0].localeCompare(right[0], 'en', {
        sensitivity: 'base',
        numeric: true
      });
    })
    .map(([stageLabel, stageMatches]) => {
      const completedCount = stageMatches.filter((match) => normalizeText(match.status) === 'Completed')
        .length;

      return {
        name: stageLabel,
        tone: 'stage',
        details: [
          pluralize(stageMatches.length, 'fixture'),
          completedCount ? `${completedCount} completed` : 'Published for planning'
        ],
        children: stageMatches.map((match) => ({
          name: getFixtureTitle(match),
          tone: getMatchTone(match),
          matchId: match._id,
          details: [
            truncate(getMatchLabel(match), 28),
            truncate(`${normalizeText(match.status) || 'Pending'} • ${getCompactScheduleLabel(match)}`, 38)
          ]
        }))
      };
    });
};

const buildDependencyMatchNode = (match, aliasMap, lineage = new Set()) => {
  const nextLineage = new Set(lineage);
  nextLineage.add(match._id);

  const createDependencyChild = (sourceLabel, fallbackLabel) => {
    const normalizedSource = normalizeText(sourceLabel) || normalizeText(fallbackLabel);
    const referencedMatch = resolveSourceReference(normalizedSource, aliasMap);

    if (referencedMatch && !nextLineage.has(referencedMatch._id)) {
      return buildDependencyMatchNode(referencedMatch, aliasMap, nextLineage);
    }

    return createTeamLeafNode(normalizedSource, fallbackLabel);
  };

  const matchChildren = [
    createDependencyChild(match.teamASource || match.teamA, match.teamA),
    createDependencyChild(match.teamBSource || match.teamB, match.teamB)
  ];

  return {
    name: getMatchLabel(match),
    tone: getMatchTone(match),
    matchId: match._id,
    details: [
      truncate(`${match.teamA || 'Team A'} vs ${match.teamB || 'Team B'}`, 36),
      truncate(`${normalizeText(match.status) || 'Pending'} • ${getCompactScheduleLabel(match)}`, 40),
      match.winnerTeam ? `Winner: ${truncate(match.winnerTeam, 22)}` : ''
    ].filter(Boolean),
    children: matchChildren
  };
};

const getTreeMetrics = (node) => {
  if (!node) {
    return {
      depth: 0,
      leafCount: 0,
      nodeCount: 0
    };
  }

  if (!Array.isArray(node.children) || !node.children.length) {
    return {
      depth: 1,
      leafCount: 1,
      nodeCount: 1
    };
  }

  const childMetrics = node.children.map(getTreeMetrics);

  return {
    depth: 1 + Math.max(...childMetrics.map((item) => item.depth)),
    leafCount: childMetrics.reduce((total, item) => total + item.leafCount, 0),
    nodeCount: 1 + childMetrics.reduce((total, item) => total + item.nodeCount, 0)
  };
};

export const buildFixtureVisualization = ({ eventName = '', matches = [] } = {}) => {
  const sortedMatches = sortMatchesBySchedule(matches);

  if (!sortedMatches.length) {
    return null;
  }

  const dependencyMatches = sortedMatches.filter(isDependencyCandidate);
  const dependencyMatchIds = new Set(dependencyMatches.map((match) => match._id));
  const stageMatches = sortedMatches.filter((match) => !dependencyMatchIds.has(match._id));
  const useDependencyTree = dependencyMatches.length > 0;

  let rootChildren;
  let mode = 'stage';
  let viewLabel = 'Stage Overview';

  if (useDependencyTree) {
    const aliasMap = buildAliasMap(dependencyMatches);
    const referencedMatchIds = new Set();

    dependencyMatches.forEach((match) => {
      [match.teamASource, match.teamBSource].forEach((source) => {
        const referencedMatch = resolveSourceReference(source, aliasMap);

        if (referencedMatch) {
          referencedMatchIds.add(referencedMatch._id);
        }
      });
    });

    const dependencyRoots = dependencyMatches
      .filter((match) => !referencedMatchIds.has(match._id))
      .sort((left, right) => {
        const priorityDelta = stagePriority(right) - stagePriority(left);

        if (priorityDelta) {
          return priorityDelta;
        }

        return Number(right.matchNumber || 0) - Number(left.matchNumber || 0);
      });

    const fallbackRoots = dependencyRoots.length
      ? dependencyRoots
      : [...dependencyMatches]
          .sort((left, right) => stagePriority(right) - stagePriority(left))
          .slice(0, 1);

    rootChildren = [
      ...fallbackRoots.map((match) => buildDependencyMatchNode(match, aliasMap)),
      ...buildStageTreeNodes(stageMatches)
    ];
    mode = 'dependency';
    viewLabel = stageMatches.length ? 'Knockout Flow + Stage Summary' : 'Knockout Flow';
  } else {
    rootChildren = buildStageTreeNodes(sortedMatches);
  }

  const treeData = {
    name: truncate(eventName || 'Fixture Planner View', 34) || 'Fixture Planner View',
    tone: 'root',
    details: [
      viewLabel,
      `${pluralize(sortedMatches.length, 'fixture')} • ${sortedMatches.filter((match) => normalizeText(match.status) === 'Completed').length} completed`
    ],
    children: rootChildren
  };

  return {
    data: treeData,
    mode,
    viewLabel,
    metrics: getTreeMetrics(treeData),
    summary: {
      totalFixtures: sortedMatches.length,
      completedFixtures: sortedMatches.filter((match) => normalizeText(match.status) === 'Completed').length,
      stageCount: new Set(sortedMatches.map(getMatchLabel)).size,
      dependencyCount: dependencyMatches.length
    }
  };
};

const FORCE_GRAPH_STYLE_BY_TONE = {
  root: {
    fill: '#1d4ed8',
    stroke: '#1e40af',
    size: 58,
    shape: 'square'
  },
  stage: {
    fill: '#dbeafe',
    stroke: '#60a5fa',
    size: 50,
    shape: 'square'
  },
  matchLeague: {
    fill: '#ffffff',
    stroke: '#94a3b8',
    size: 40,
    shape: 'hexagon'
  },
  matchKnockout: {
    fill: '#ede9fe',
    stroke: '#8b5cf6',
    size: 42,
    shape: 'hexagon'
  },
  matchFinal: {
    fill: '#ffedd5',
    stroke: '#f97316',
    size: 44,
    shape: 'triangle'
  },
  matchCompleted: {
    fill: '#dcfce7',
    stroke: '#22c55e',
    size: 42,
    shape: 'hexagon'
  },
  matchWarning: {
    fill: '#fee2e2',
    stroke: '#ef4444',
    size: 42,
    shape: 'hexagon'
  },
  team: {
    fill: '#ffffff',
    stroke: '#cbd5e1',
    size: 34,
    shape: 'circle'
  },
  seed: {
    fill: '#f8fafc',
    stroke: '#cbd5e1',
    size: 34,
    shape: 'circle'
  }
};

const flattenPlannerNodeToGraph = (node, accumulator, parentId = '', path = 'root') => {
  const tone = node.tone || 'team';
  const style = FORCE_GRAPH_STYLE_BY_TONE[tone] || FORCE_GRAPH_STYLE_BY_TONE.team;
  const nodeId = normalizeText(node.matchId) || `${path}-${accumulator.nodes.length}`;

  accumulator.nodes.push({
    id: nodeId,
    label: truncate(node.name, 28) || 'Node',
    subLabel: (Array.isArray(node.details) ? node.details : [])
      .filter(Boolean)
      .slice(0, 2)
      .join(' • '),
    tone,
    fill: style.fill,
    stroke: style.stroke,
    size: style.size,
    shape: style.shape,
    matchId: normalizeText(node.matchId)
  });

  if (parentId) {
    accumulator.links.push({
      id: `${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      stroke: tone === 'stage' ? '#93c5fd' : '#cbd5e1',
      width: tone === 'root' || tone === 'stage' ? 2.2 : 1.8
    });
  }

  (Array.isArray(node.children) ? node.children : []).forEach((childNode, index) => {
    flattenPlannerNodeToGraph(childNode, accumulator, nodeId, `${nodeId}-${index}`);
  });
};

export const buildFixtureForceGraphData = (visualization) => {
  if (!visualization?.data) {
    return {
      nodes: [],
      links: []
    };
  }

  const accumulator = {
    nodes: [],
    links: []
  };

  flattenPlannerNodeToGraph(visualization.data, accumulator);
  return accumulator;
};
