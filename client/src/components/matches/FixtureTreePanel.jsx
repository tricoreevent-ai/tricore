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

const getNodeDimensions = (tone, displayMode) => {
  const isFullscreen = displayMode === 'fullscreen';

  if (tone === 'root') {
    return {
      width: isFullscreen ? 320 : 270,
      height: isFullscreen ? 92 : 80
    };
  }

  if (tone === 'stage') {
    return {
      width: isFullscreen ? 280 : 236,
      height: isFullscreen ? 96 : 84
    };
  }

  if (tone === 'team' || tone === 'seed') {
    return {
      width: isFullscreen ? 224 : 192,
      height: isFullscreen ? 74 : 62
    };
  }

  return {
    width: isFullscreen ? 320 : 262,
    height: isFullscreen ? 130 : 110
  };
};

const renderFixtureNode = ({ displayMode, nodeDatum, selectedMatchId }) => {
  const tone = nodeDatum.tone || 'team';
  const styles = TONE_STYLES[tone] || TONE_STYLES.team;
  const details = Array.isArray(nodeDatum.details) ? nodeDatum.details.filter(Boolean).slice(0, 3) : [];
  const isSelected = Boolean(nodeDatum.matchId && nodeDatum.matchId === selectedMatchId);
  const { width, height } = getNodeDimensions(tone, displayMode);
  const titleSize = displayMode === 'fullscreen' ? 16 : 14;
  const detailSize = displayMode === 'fullscreen' ? 13 : 11.5;
  const titleY = tone === 'team' || tone === 'seed' ? -4 : displayMode === 'fullscreen' ? -26 : -18;
  const detailYBase = tone === 'team' || tone === 'seed' ? 18 : displayMode === 'fullscreen' ? 2 : 6;

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
        fontSize={titleSize}
        fontWeight="700"
        textAnchor="middle"
        x="0"
        y={titleY}
      >
        {nodeDatum.name}
      </text>
      {details.map((line, index) => (
        <text
          fill={tone === 'root' ? 'rgba(255,255,255,0.86)' : '#64748b'}
          fontFamily="Segoe UI, Arial, sans-serif"
          fontSize={detailSize}
          key={`${nodeDatum.name}-${index}`}
          textAnchor="middle"
          x="0"
          y={detailYBase + index * (displayMode === 'fullscreen' ? 16 : 14)}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

function FixtureTreeCanvas({
  containerRef,
  displayMode,
  onSelectMatch,
  selectedMatchId,
  visualization
}) {
  const [containerWidth, setContainerWidth] = useState(960);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window === 'undefined' ? 900 : window.innerHeight
  );

  useEffect(() => {
    const containerElement = containerRef.current;

    if (!containerElement) {
      return undefined;
    }

    const updateMeasurements = () => {
      setContainerWidth(Math.max(containerElement.getBoundingClientRect().width, 320));
      setViewportHeight(typeof window === 'undefined' ? 900 : window.innerHeight);
    };

    updateMeasurements();

    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(updateMeasurements) : null;

    resizeObserver?.observe(containerElement);
    window.addEventListener('resize', updateMeasurements);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateMeasurements);
    };
  }, [containerRef]);

  useEffect(() => {
    const svgElement = containerRef.current?.querySelector('svg');

    if (!svgElement) {
      return;
    }

    svgElement.querySelectorAll('.rd3t-link').forEach((pathElement) => {
      pathElement.setAttribute('fill', 'none');
      pathElement.setAttribute('stroke', '#cbd5e1');
      pathElement.setAttribute('stroke-width', displayMode === 'fullscreen' ? '2.8' : '2.4');
      pathElement.setAttribute('stroke-linecap', 'round');
      pathElement.setAttribute('stroke-linejoin', 'round');
    });
  }, [containerRef, displayMode, visualization, containerWidth, selectedMatchId]);

  const treeHeight = useMemo(() => {
    if (displayMode === 'fullscreen') {
      return clamp(viewportHeight - 230, 620, 1200);
    }

    if (visualization.mode === 'dependency') {
      return clamp(visualization.metrics.leafCount * 108 + 260, 580, 1020);
    }

    return clamp(visualization.metrics.nodeCount * 40 + 340, 540, 880);
  }, [displayMode, viewportHeight, visualization]);

  const orientation = visualization.mode === 'dependency' ? 'horizontal' : 'vertical';
  const estimatedGraphWidth =
    visualization.mode === 'dependency'
      ? visualization.metrics.depth * (displayMode === 'fullscreen' ? 420 : 340)
      : Math.max(visualization.metrics.leafCount, 2) * (displayMode === 'fullscreen' ? 280 : 220);
  const estimatedGraphHeight =
    visualization.mode === 'dependency'
      ? Math.max(visualization.metrics.leafCount, 2) * (displayMode === 'fullscreen' ? 190 : 170)
      : visualization.metrics.depth * (displayMode === 'fullscreen' ? 220 : 190);
  const initialZoom = clamp(
    Math.min((containerWidth - 96) / estimatedGraphWidth, (treeHeight - 72) / estimatedGraphHeight, 1),
    displayMode === 'fullscreen' ? 0.36 : 0.28,
    1
  );
  const translate =
    visualization.mode === 'dependency'
      ? { x: displayMode === 'fullscreen' ? 220 : 190, y: treeHeight / 2 }
      : { x: containerWidth / 2, y: displayMode === 'fullscreen' ? 110 : 96 };
  const nodeSize =
    visualization.mode === 'dependency'
      ? displayMode === 'fullscreen'
        ? { x: 410, y: 250 }
        : { x: 335, y: 205 }
      : displayMode === 'fullscreen'
        ? { x: 320, y: 235 }
        : { x: 255, y: 190 };

  return (
    <div
      className={`overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] ${
        displayMode === 'fullscreen' ? 'shadow-[0_28px_90px_rgba(15,23,42,0.14)]' : ''
      }`}
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
            displayMode,
            selectedMatchId
          })
        }
        separation={
          displayMode === 'fullscreen'
            ? { siblings: 1.18, nonSiblings: 1.7 }
            : { siblings: 1.08, nonSiblings: 1.48 }
        }
        translate={translate}
        zoom={initialZoom}
      />
    </div>
  );
}

export default function FixtureTreePanel({
  eventName = '',
  matches = [],
  selectedMatchId = '',
  onPrintError,
  onPrintSuccess,
  onSelectMatch
}) {
  const inlineContainerRef = useRef(null);
  const fullscreenContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const visualization = useMemo(
    () => buildFixtureVisualization({ eventName, matches }),
    [eventName, matches]
  );

  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

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

  const handlePrint = (displayMode = 'page') => {
    const svgElement =
      displayMode === 'fullscreen'
        ? fullscreenContainerRef.current?.querySelector('svg')
        : inlineContainerRef.current?.querySelector('svg');
    const opened = printMatchFixtureTree({
      eventName,
      matches,
      svgElement,
      viewLabel:
        displayMode === 'fullscreen'
          ? `${visualization.viewLabel} - Full Screen Planner`
          : visualization.viewLabel || 'Fixture Planner View'
    });

    if (!opened) {
      onPrintError?.('Unable to open the fixture planner print window. Check browser pop-up settings.');
      return;
    }

    onPrintSuccess?.('Fixture planner print view opened in a new tab.');
  };

  return (
    <>
      <section className="panel space-y-5 p-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Fixture Planner Tree</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              A full-width React D3 planner view for published fixtures. Use it to review bracket
              flow, stage order, and dependencies more clearly, then open the full-screen view for
              large event planning sessions and printing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-secondary" onClick={() => setIsFullscreen(true)} type="button">
              <span className="mr-2 inline-flex align-middle">
                <AppIcon className="h-4 w-4" name="expand" />
              </span>
              Open Full Screen
            </button>
            <button className="btn-secondary" onClick={() => handlePrint('page')} type="button">
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
          <span className="badge bg-slate-100 text-slate-700">
            Click a match node to open it in the editor
          </span>
        </div>

        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-500">
          The planner now spans the full workspace width for better readability. Use full-screen
          mode when you need a room-friendly visual, then print that larger view for scheduling
          discussions.
        </div>

        <FixtureTreeCanvas
          containerRef={inlineContainerRef}
          displayMode="page"
          onSelectMatch={onSelectMatch}
          selectedMatchId={selectedMatchId}
          visualization={visualization}
        />
      </section>

      {isFullscreen ? (
        <div
          className="fixed inset-0 z-[140] bg-slate-950/35 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setIsFullscreen(false)}
          role="presentation"
        >
          <div
            className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_36px_120px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Fixture planner full screen view"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Fixture Planner Full Screen
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">{eventName}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Larger readable view for planners, review calls, and print preparation.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="btn-secondary" onClick={() => handlePrint('fullscreen')} type="button">
                  <span className="mr-2 inline-flex align-middle">
                    <AppIcon className="h-4 w-4" name="export" />
                  </span>
                  Print This View
                </button>
                <button className="btn-secondary" onClick={() => setIsFullscreen(false)} type="button">
                  <span className="mr-2 inline-flex align-middle">
                    <AppIcon className="h-4 w-4" name="compress" />
                  </span>
                  Exit Full Screen
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-4 py-4 sm:px-6">
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="badge bg-brand-mist text-brand-blue">{visualization.viewLabel}</span>
                <span className="badge bg-slate-100 text-slate-700">
                  {visualization.summary.totalFixtures} Fixtures
                </span>
                <span className="badge bg-emerald-50 text-emerald-700">
                  {visualization.summary.completedFixtures} Completed
                </span>
              </div>

              <FixtureTreeCanvas
                containerRef={fullscreenContainerRef}
                displayMode="fullscreen"
                onSelectMatch={onSelectMatch}
                selectedMatchId={selectedMatchId}
                visualization={visualization}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
