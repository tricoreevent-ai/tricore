import { useEffect, useMemo, useRef, useState } from 'react';
import Tree from 'react-d3-tree';

import AppIcon from '../common/AppIcon.jsx';
import { buildFixtureVisualization } from '../../utils/matchTree.js';
import { printMatchFixtureTree } from '../../utils/printMatchFixtureTree.js';

const TONE_STYLES = {
  root: {
    fill: '#1d4ed8',
    stroke: '#1e40af',
    text: '#ffffff'
  },
  stage: {
    fill: '#eff6ff',
    stroke: '#93c5fd',
    text: '#0f172a'
  },
  matchLeague: {
    fill: '#f8fafc',
    stroke: '#cbd5e1',
    text: '#0f172a'
  },
  matchKnockout: {
    fill: '#f5f3ff',
    stroke: '#c4b5fd',
    text: '#0f172a'
  },
  matchFinal: {
    fill: '#fff7ed',
    stroke: '#fdba74',
    text: '#0f172a'
  },
  matchCompleted: {
    fill: '#ecfdf5',
    stroke: '#86efac',
    text: '#0f172a'
  },
  matchWarning: {
    fill: '#fff7ed',
    stroke: '#fca5a5',
    text: '#0f172a'
  },
  team: {
    fill: '#ffffff',
    stroke: '#dbeafe',
    text: '#334155'
  },
  seed: {
    fill: '#f8fafc',
    stroke: '#e2e8f0',
    text: '#475569'
  }
};

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const getNodeDimensions = (tone) => {
  if (tone === 'root') {
    return {
      width: 250,
      height: 74
    };
  }

  if (tone === 'stage') {
    return {
      width: 220,
      height: 78
    };
  }

  if (tone === 'team' || tone === 'seed') {
    return {
      width: 178,
      height: 58
    };
  }

  return {
    width: 242,
    height: 102
  };
};

const renderFixtureNode = ({ nodeDatum, selectedMatchId }) => {
  const tone = nodeDatum.tone || 'team';
  const styles = TONE_STYLES[tone] || TONE_STYLES.team;
  const details = Array.isArray(nodeDatum.details) ? nodeDatum.details.filter(Boolean).slice(0, 3) : [];
  const isSelected = Boolean(nodeDatum.matchId && nodeDatum.matchId === selectedMatchId);
  const { width, height } = getNodeDimensions(tone);

  return (
    <g style={{ cursor: nodeDatum.matchId ? 'pointer' : 'default' }}>
      <rect
        fill={styles.fill}
        height={height}
        rx={24}
        stroke={isSelected ? '#2563eb' : styles.stroke}
        strokeWidth={isSelected ? 3 : 1.5}
        width={width}
        x={-width / 2}
        y={-height / 2}
      />
      <text
        fill={styles.text}
        fontFamily="Segoe UI, Arial, sans-serif"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
        x="0"
        y={tone === 'team' || tone === 'seed' ? -4 : -18}
      >
        {nodeDatum.name}
      </text>
      {details.map((line, index) => (
        <text
          fill={tone === 'root' ? 'rgba(255,255,255,0.86)' : '#64748b'}
          fontFamily="Segoe UI, Arial, sans-serif"
          fontSize="11.5"
          key={`${nodeDatum.name}-${index}`}
          textAnchor="middle"
          x="0"
          y={(tone === 'team' || tone === 'seed' ? 16 : 6) + index * 14}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

export default function FixtureTreePanel({
  eventName = '',
  matches = [],
  selectedMatchId = '',
  onPrintError,
  onPrintSuccess,
  onSelectMatch
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(960);

  const visualization = useMemo(
    () => buildFixtureVisualization({ eventName, matches }),
    [eventName, matches]
  );

  useEffect(() => {
    const containerElement = containerRef.current;

    if (!containerElement) {
      return undefined;
    }

    const updateWidth = () => {
      setContainerWidth(Math.max(containerElement.getBoundingClientRect().width, 320));
    };

    updateWidth();

    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(updateWidth) : null;

    resizeObserver?.observe(containerElement);
    window.addEventListener('resize', updateWidth);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  useEffect(() => {
    const svgElement = containerRef.current?.querySelector('svg');

    if (!svgElement) {
      return;
    }

    svgElement.querySelectorAll('.rd3t-link').forEach((pathElement) => {
      pathElement.setAttribute('fill', 'none');
      pathElement.setAttribute('stroke', '#cbd5e1');
      pathElement.setAttribute('stroke-width', '2.4');
      pathElement.setAttribute('stroke-linecap', 'round');
      pathElement.setAttribute('stroke-linejoin', 'round');
    });
  }, [visualization, containerWidth, selectedMatchId]);

  const treeHeight = useMemo(() => {
    if (!visualization) {
      return 420;
    }

    if (visualization.mode === 'dependency') {
      return clamp(visualization.metrics.leafCount * 92 + 220, 460, 860);
    }

    return clamp(visualization.metrics.nodeCount * 34 + 260, 420, 760);
  }, [visualization]);

  if (!visualization) {
    return (
      <section className="panel space-y-4 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <AppIcon className="h-5 w-5" name="matches" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Fixture Planner Tree</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Publish or create at least one fixture to unlock the visual planner view.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const orientation = visualization?.mode === 'dependency' ? 'horizontal' : 'vertical';
  const estimatedGraphWidth =
    visualization.mode === 'dependency'
      ? visualization.metrics.depth * 290
      : Math.max(visualization.metrics.leafCount, 2) * 210;
  const estimatedGraphHeight =
    visualization.mode === 'dependency'
      ? Math.max(visualization.metrics.leafCount, 2) * 160
      : visualization.metrics.depth * 180;
  const initialZoom = clamp(
    Math.min((containerWidth - 80) / estimatedGraphWidth, (treeHeight - 60) / estimatedGraphHeight, 1),
    0.22,
    1
  );
  const translate =
    visualization.mode === 'dependency'
      ? { x: 170, y: treeHeight / 2 }
      : { x: containerWidth / 2, y: 90 };
  const nodeSize =
    visualization.mode === 'dependency'
      ? { x: 290, y: 170 }
      : { x: 230, y: 170 };

  const handlePrint = () => {
    const svgElement = containerRef.current?.querySelector('svg');
    const opened = printMatchFixtureTree({
      eventName,
      matches,
      svgElement,
      viewLabel: visualization?.viewLabel || 'Fixture Planner View'
    });

    if (!opened) {
      onPrintError?.('Unable to open the fixture planner print window. Check browser pop-up settings.');
      return;
    }

    onPrintSuccess?.('Fixture planner print view opened in a new tab.');
  };

  return (
    <section className="panel space-y-5 p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Fixture Planner Tree</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            A React D3 tree view of the published fixtures. Click any match node to load it into
            the editor, then print the current planner view for scheduling reviews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-secondary" onClick={handlePrint} type="button">
            <span className="mr-2 inline-flex align-middle">
              <AppIcon className="h-4 w-4" name="export" />
            </span>
            Print Planner View
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <span className="badge bg-brand-mist text-brand-blue">{visualization.viewLabel}</span>
        <span className="badge bg-slate-100 text-slate-700">
          {visualization.summary.totalFixtures} Fixtures
        </span>
        <span className="badge bg-emerald-50 text-emerald-700">
          {visualization.summary.completedFixtures} Completed
        </span>
        <span className="badge bg-slate-100 text-slate-700">
          {visualization.summary.stageCount} Stages
        </span>
      </div>

      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-500">
        Drag to inspect dense branches, use browser zoom if needed, and print the exact tree view
        currently visible to planners.
      </div>

      <div
        className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]"
        ref={containerRef}
        style={{ height: treeHeight }}
      >
        <Tree
          collapsible={false}
          data={visualization.data}
          dimensions={{ width: containerWidth, height: treeHeight }}
          draggable
          nodeSize={nodeSize}
          onNodeClick={(node) => {
            if (node.data?.matchId) {
              onSelectMatch?.(node.data.matchId);
            }
          }}
          orientation={orientation}
          pathFunc="elbow"
          renderCustomNodeElement={(nodeProps) =>
            renderFixtureNode({
              ...nodeProps,
              selectedMatchId
            })
          }
          separation={{ siblings: 1.05, nonSiblings: 1.45 }}
          translate={translate}
          zoom={initialZoom}
        />
      </div>
    </section>
  );
}
