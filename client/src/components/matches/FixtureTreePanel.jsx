import { useEffect, useMemo, useRef, useState } from 'react';
import Tree from 'react-d3-tree';
import { VisGraph, VisGraphSelectors, VisSingleContainer } from '@unovis/react';
import {
  GraphLayoutType,
  GraphNodeSelectionHighlightMode,
  GraphNodeShape
} from '@unovis/ts';

import AppIcon from '../common/AppIcon.jsx';
import {
  buildFixtureForceGraphData,
  buildFixtureVisualization
} from '../../utils/matchTree.js';
import { printMatchFixtureTree } from '../../utils/printMatchFixtureTree.js';

const VIEW_MODES = [
  { key: 'tree', label: 'Planner Tree' },
  { key: 'force', label: 'Force Layout Graph' }
];

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
    fill: '#ffffff',
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
    fill: '#fef2f2',
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

const TREE_SCALE_EXTENT = {
  page: { min: 0.5, max: 2.2 },
  fullscreen: { min: 0.55, max: 2.5 }
};

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const formatZoomLabel = (value) => `${Math.round(value)}%`;

const toUnovisNodeShape = (shape) => {
  if (shape === 'square') {
    return GraphNodeShape.Square;
  }

  if (shape === 'triangle') {
    return GraphNodeShape.Triangle;
  }

  if (shape === 'hexagon') {
    return GraphNodeShape.Hexagon;
  }

  return GraphNodeShape.Circle;
};

function ZoomControls({ onFit, onZoomIn, onZoomOut, zoomLabel }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-soft">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Zoom</span>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-bold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue"
          onClick={onZoomOut}
          type="button"
        >
          -
        </button>
        <span className="min-w-[52px] text-center text-sm font-semibold text-slate-700">{zoomLabel}</span>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-bold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue"
          onClick={onZoomIn}
          type="button"
        >
          +
        </button>
        <button
          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-brand-blue hover:text-brand-blue"
          onClick={onFit}
          type="button"
        >
          Fit
        </button>
      </div>
    </div>
  );
}

const getNodeDimensions = (tone, displayMode) => {
  const isFullscreen = displayMode === 'fullscreen';

  if (tone === 'root') {
    return {
      width: isFullscreen ? 360 : 310,
      height: isFullscreen ? 108 : 96
    };
  }

  if (tone === 'stage') {
    return {
      width: isFullscreen ? 310 : 270,
      height: isFullscreen ? 104 : 90
    };
  }

  if (tone === 'team' || tone === 'seed') {
    return {
      width: isFullscreen ? 238 : 212,
      height: isFullscreen ? 84 : 74
    };
  }

  return {
    width: isFullscreen ? 338 : 300,
    height: isFullscreen ? 144 : 126
  };
};

const renderFixtureNode = ({ displayMode, nodeDatum, selectedMatchId }) => {
  const tone = nodeDatum.tone || 'team';
  const styles = TONE_STYLES[tone] || TONE_STYLES.team;
  const details = Array.isArray(nodeDatum.details) ? nodeDatum.details.filter(Boolean).slice(0, 3) : [];
  const isSelected = Boolean(nodeDatum.matchId && nodeDatum.matchId === selectedMatchId);
  const { width, height } = getNodeDimensions(tone, displayMode);
  const titleSize = displayMode === 'fullscreen' ? 18 : 16;
  const detailSize = displayMode === 'fullscreen' ? 13.5 : 12.5;
  const titleY = tone === 'team' || tone === 'seed' ? -4 : displayMode === 'fullscreen' ? -28 : -20;
  const detailYBase = tone === 'team' || tone === 'seed' ? 20 : displayMode === 'fullscreen' ? 6 : 10;

  return (
    <g style={{ cursor: nodeDatum.matchId ? 'pointer' : 'default' }}>
      <rect
        fill={styles.fill}
        height={height}
        rx={26}
        shapeRendering="geometricPrecision"
        stroke={isSelected ? '#2563eb' : styles.stroke}
        strokeWidth={isSelected ? 3 : 1.5}
        vectorEffect="non-scaling-stroke"
        width={width}
        x={-width / 2}
        y={-height / 2}
      />
      <text
        fill={styles.text}
        fontFamily="Segoe UI, Arial, sans-serif"
        fontSize={titleSize}
        fontWeight="700"
        style={{ textRendering: 'geometricPrecision' }}
        textAnchor="middle"
        x="0"
        y={titleY}
      >
        {nodeDatum.name}
      </text>
      {details.map((line, index) => (
        <text
          fill={tone === 'root' ? 'rgba(255,255,255,0.9)' : '#475569'}
          fontFamily="Segoe UI, Arial, sans-serif"
          fontSize={detailSize}
          key={`${nodeDatum.name}-${index}`}
          style={{ textRendering: 'geometricPrecision' }}
          textAnchor="middle"
          x="0"
          y={detailYBase + index * (displayMode === 'fullscreen' ? 17 : 15)}
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
  const [zoomPercent, setZoomPercent] = useState(100);
  const liveViewRef = useRef(null);
  const [controlledView, setControlledView] = useState(null);

  const scaleExtent =
    displayMode === 'fullscreen'
      ? TREE_SCALE_EXTENT.fullscreen
      : TREE_SCALE_EXTENT.page;

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

  const treeHeight = useMemo(() => {
    if (displayMode === 'fullscreen') {
      return clamp(viewportHeight - 280, 640, 1200);
    }

    if (visualization.mode === 'dependency') {
      return clamp(visualization.metrics.leafCount * 124 + 280, 620, 1120);
    }

    return clamp(visualization.metrics.nodeCount * 48 + 360, 580, 940);
  }, [displayMode, viewportHeight, visualization]);

  const orientation = visualization.mode === 'dependency' ? 'horizontal' : 'vertical';
  const estimatedGraphWidth =
    visualization.mode === 'dependency'
      ? visualization.metrics.depth * (displayMode === 'fullscreen' ? 470 : 380)
      : Math.max(visualization.metrics.leafCount, 2) *
        (displayMode === 'fullscreen' ? 300 : 250);
  const estimatedGraphHeight =
    visualization.mode === 'dependency'
      ? Math.max(visualization.metrics.leafCount, 2) *
        (displayMode === 'fullscreen' ? 215 : 190)
      : visualization.metrics.depth * (displayMode === 'fullscreen' ? 245 : 210);
  const readableMinimumZoom = displayMode === 'fullscreen' ? 0.9 : 0.78;
  const fitView = useMemo(() => {
    const fitZoom = clamp(
      Math.min(
        (containerWidth - 120) / estimatedGraphWidth,
        (treeHeight - 96) / estimatedGraphHeight,
        1.1
      ),
      readableMinimumZoom,
      scaleExtent.max
    );

    return {
      zoom: fitZoom,
      translate:
        visualization.mode === 'dependency'
          ? {
              x: displayMode === 'fullscreen' ? 230 : 190,
              y: treeHeight / 2
            }
          : {
              x: containerWidth / 2,
              y: displayMode === 'fullscreen' ? 120 : 104
            }
    };
  }, [
    containerWidth,
    displayMode,
    estimatedGraphHeight,
    estimatedGraphWidth,
    readableMinimumZoom,
    scaleExtent.max,
    treeHeight,
    visualization.mode
  ]);

  useEffect(() => {
    const nextView = {
      zoom: fitView.zoom,
      translate: fitView.translate
    };

    liveViewRef.current = nextView;
    setControlledView(nextView);
    setZoomPercent(Math.round(nextView.zoom * 100));
  }, [fitView.translate.x, fitView.translate.y, fitView.zoom, visualization.data]);

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
      pathElement.setAttribute('vector-effect', 'non-scaling-stroke');
      pathElement.setAttribute('shape-rendering', 'geometricPrecision');
    });
  }, [containerRef, controlledView, displayMode, selectedMatchId, visualization]);

  const applyViewState = (nextView) => {
    liveViewRef.current = nextView;
    setControlledView(nextView);
    setZoomPercent(Math.round(nextView.zoom * 100));
  };

  const handleZoom = (direction) => {
    const currentView = liveViewRef.current || fitView;
    const step = displayMode === 'fullscreen' ? 0.14 : 0.12;

    applyViewState({
      ...currentView,
      zoom: clamp(
        currentView.zoom + direction * step,
        scaleExtent.min,
        scaleExtent.max
      )
    });
  };

  const handleFit = () => {
    applyViewState({
      zoom: fitView.zoom,
      translate: fitView.translate
    });
  };

  const nodeSize =
    visualization.mode === 'dependency'
      ? displayMode === 'fullscreen'
        ? { x: 440, y: 270 }
        : { x: 360, y: 220 }
      : displayMode === 'fullscreen'
        ? { x: 340, y: 250 }
        : { x: 280, y: 210 };

  return (
    <div className="space-y-4">
      <ZoomControls
        onFit={handleFit}
        onZoomIn={() => handleZoom(1)}
        onZoomOut={() => handleZoom(-1)}
        zoomLabel={formatZoomLabel(zoomPercent)}
      />

      <div
        className={`overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] ${
          displayMode === 'fullscreen' ? 'shadow-[0_28px_90px_rgba(15,23,42,0.14)]' : ''
        }`}
        ref={containerRef}
        style={{ height: treeHeight }}
      >
        {controlledView ? (
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
            onUpdate={({ zoom, translate }) => {
              liveViewRef.current = { zoom, translate };
              setZoomPercent((currentValue) => {
                const nextValue = Math.round(zoom * 100);
                return Math.abs(currentValue - nextValue) >= 2 ? nextValue : currentValue;
              });
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
            scaleExtent={scaleExtent}
            separation={
              displayMode === 'fullscreen'
                ? { siblings: 1.2, nonSiblings: 1.72 }
                : { siblings: 1.1, nonSiblings: 1.52 }
            }
            translate={controlledView.translate}
            zoom={controlledView.zoom}
          />
        ) : null}
      </div>
    </div>
  );
}

function ForceGraphCanvas({
  containerRef,
  displayMode,
  graphData,
  onSelectMatch,
  selectedMatchId,
  visualization
}) {
  const graphRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window === 'undefined' ? 900 : window.innerHeight
  );
  const [zoomPercent, setZoomPercent] = useState(100);

  useEffect(() => {
    const updateMeasurements = () => {
      setViewportHeight(typeof window === 'undefined' ? 900 : window.innerHeight);
    };

    updateMeasurements();
    window.addEventListener('resize', updateMeasurements);

    return () => {
      window.removeEventListener('resize', updateMeasurements);
    };
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => {
      graphRef.current?.component?.fitView(0);
    }, 80);

    return () => {
      clearTimeout(timerId);
    };
  }, [displayMode, graphData.links.length, graphData.nodes.length]);

  const graphHeight = useMemo(() => {
    if (displayMode === 'fullscreen') {
      return clamp(viewportHeight - 280, 640, 1200);
    }

    return clamp(visualization.metrics.nodeCount * 54 + 420, 620, 980);
  }, [displayMode, viewportHeight, visualization.metrics.nodeCount]);

  const graphEvents = useMemo(
    () => ({
      [VisGraphSelectors.node]: {
        click: (node) => {
          if (node.matchId) {
            onSelectMatch?.(node.matchId);
          }
        }
      }
    }),
    [onSelectMatch]
  );

  return (
    <div className="space-y-4">
      <ZoomControls
        onFit={() => graphRef.current?.component?.fitView(450)}
        onZoomIn={() => graphRef.current?.component?.zoomIn(0.22)}
        onZoomOut={() => graphRef.current?.component?.zoomOut(0.22)}
        zoomLabel={formatZoomLabel(zoomPercent)}
      />

      <div
        className={`overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] ${
          displayMode === 'fullscreen' ? 'shadow-[0_28px_90px_rgba(15,23,42,0.14)]' : ''
        }`}
        ref={containerRef}
      >
        <VisSingleContainer
          data={graphData}
          style={{ height: `${graphHeight}px`, width: '100%' }}
        >
          <VisGraph
            ref={graphRef}
            attributes={{
              [VisGraphSelectors.node]: {
                cursor: (node) => (node.matchId ? 'pointer' : 'grab')
              },
              [VisGraphSelectors.nodeLabel]: {
                'text-rendering': 'geometricPrecision'
              }
            }}
            disableDrag={false}
            events={graphEvents}
            fitViewPadding={displayMode === 'fullscreen' ? 90 : 70}
            forceLayoutSettings={{
              charge: displayMode === 'fullscreen' ? -2200 : -1700,
              forceXStrength: 0.12,
              forceYStrength: 0.18,
              linkDistance: displayMode === 'fullscreen' ? 200 : 165,
              linkStrength: 0.42
            }}
            layoutAutofit
            layoutType={GraphLayoutType.Force}
            linkStroke={(link) => link.stroke}
            linkWidth={(link) => link.width}
            nodeFill={(node) => node.fill}
            nodeLabel={(node) => node.label}
            nodeLabelTrim
            nodeLabelTrimLength={displayMode === 'fullscreen' ? 30 : 22}
            nodeSelectionHighlightMode={
              GraphNodeSelectionHighlightMode.GreyoutNonConnected
            }
            nodeShape={(node) => toUnovisNodeShape(node.shape)}
            nodeSize={(node) => node.size}
            nodeStroke={(node) => node.stroke}
            nodeSubLabel={(node) => node.subLabel}
            nodeSubLabelTrim
            nodeSubLabelTrimLength={displayMode === 'fullscreen' ? 44 : 28}
            onZoom={(zoomScale) => setZoomPercent(Math.round(zoomScale * 100))}
            selectedNodeId={selectedMatchId || undefined}
            zoomScaleExtent={[0.45, 2.5]}
          />
        </VisSingleContainer>
      </div>
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
  const inlineTreeContainerRef = useRef(null);
  const fullscreenTreeContainerRef = useRef(null);
  const inlineForceContainerRef = useRef(null);
  const fullscreenForceContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('tree');

  const visualization = useMemo(
    () => buildFixtureVisualization({ eventName, matches }),
    [eventName, matches]
  );

  const forceGraphData = useMemo(
    () => buildFixtureForceGraphData(visualization),
    [visualization]
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
            <h2 className="text-2xl font-bold text-slate-950">Fixture Planner</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Publish or create at least one fixture to unlock the planner views.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const activeViewLabel =
    viewMode === 'force' ? 'Force Layout Graph' : 'Planner Tree';

  const getContainerRefForPrint = (displayMode) => {
    if (viewMode === 'force') {
      return displayMode === 'fullscreen'
        ? fullscreenForceContainerRef
        : inlineForceContainerRef;
    }

    return displayMode === 'fullscreen'
      ? fullscreenTreeContainerRef
      : inlineTreeContainerRef;
  };

  const handlePrint = (displayMode = 'page') => {
    const svgElement = getContainerRefForPrint(displayMode).current?.querySelector('svg');
    const opened = printMatchFixtureTree({
      eventName,
      matches,
      svgElement,
      viewLabel:
        displayMode === 'fullscreen'
          ? `${visualization.viewLabel} - ${activeViewLabel} Full Screen`
          : `${visualization.viewLabel} - ${activeViewLabel}`
    });

    if (!opened) {
      onPrintError?.('Unable to open the fixture planner print window. Check browser pop-up settings.');
      return;
    }

    onPrintSuccess?.('Fixture planner print view opened in a new tab.');
  };

  const renderPlannerView = (displayMode) => {
    if (viewMode === 'force') {
      return (
        <ForceGraphCanvas
          containerRef={
            displayMode === 'fullscreen'
              ? fullscreenForceContainerRef
              : inlineForceContainerRef
          }
          displayMode={displayMode}
          graphData={forceGraphData}
          onSelectMatch={onSelectMatch}
          selectedMatchId={selectedMatchId}
          visualization={visualization}
        />
      );
    }

    return (
      <FixtureTreeCanvas
        containerRef={
          displayMode === 'fullscreen'
            ? fullscreenTreeContainerRef
            : inlineTreeContainerRef
        }
        displayMode={displayMode}
        onSelectMatch={onSelectMatch}
        selectedMatchId={selectedMatchId}
        visualization={visualization}
      />
    );
  };

  return (
    <>
      <section className="panel space-y-5 p-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Fixture Planner</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Switch between a readable planner tree and a force layout graph. Both views support
              zoom controls, full-screen review, and print-ready output for planner discussions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 p-1 shadow-soft">
              {VIEW_MODES.map((mode) => (
                <button
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    viewMode === mode.key
                      ? 'bg-brand-blue text-white'
                      : 'text-slate-600 hover:bg-brand-mist hover:text-brand-blue'
                  }`}
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  type="button"
                >
                  {mode.label}
                </button>
              ))}
            </div>
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
              Print Current View
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <span className="badge bg-brand-mist text-brand-blue">{visualization.viewLabel}</span>
          <span className="badge bg-slate-100 text-slate-700">{activeViewLabel}</span>
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
          Use the zoom buttons to keep labels sharp instead of shrinking the whole layout too far.
          The force layout graph offers a second way to inspect fixture relationships when the tree
          view feels too rigid.
        </div>

        {renderPlannerView('page')}
      </section>

      {isFullscreen ? (
        <div
          className="fixed inset-0 z-[140] bg-slate-950/35 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setIsFullscreen(false)}
          role="presentation"
        >
          <div
            aria-label="Fixture planner full screen view"
            aria-modal="true"
            className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_36px_120px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Fixture Planner Full Screen
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">{eventName}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use the larger canvas for readability, zoom controls, and print preparation.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 p-1 shadow-soft">
                  {VIEW_MODES.map((mode) => (
                    <button
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        viewMode === mode.key
                          ? 'bg-brand-blue text-white'
                          : 'text-slate-600 hover:bg-brand-mist hover:text-brand-blue'
                      }`}
                      key={`fullscreen-${mode.key}`}
                      onClick={() => setViewMode(mode.key)}
                      type="button"
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
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
                <span className="badge bg-slate-100 text-slate-700">{activeViewLabel}</span>
                <span className="badge bg-slate-100 text-slate-700">
                  {visualization.summary.totalFixtures} Fixtures
                </span>
                <span className="badge bg-emerald-50 text-emerald-700">
                  {visualization.summary.completedFixtures} Completed
                </span>
              </div>

              {renderPlannerView('fullscreen')}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
