import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  buildHzTopologyG6Graph,
  buildHzTopologyG6EdgeDensityWindow,
  buildHzTopologyG6EdgeReadabilityProfile,
  buildHzTopologyG6FilterScope,
  buildHzTopologyG6GroupSummary,
  buildHzTopologyG6InitialFitStrategy,
  buildHzTopologyG6LargeGraphStrategy,
  buildHzTopologyG6NeighborFocus,
  buildHzTopologyG6NodeLabelCounts,
  buildHzTopologyG6NodeOnlyGridGraph,
  buildHzTopologyG6OperatorMaxZoom,
  buildHzTopologyG6PointerPanDelta,
  buildHzTopologyG6RuntimeMaxZoom,
  buildHzTopologyG6RenderWindow,
  buildHzTopologyG6ScaleFixture,
  buildHzTopologyG6ScaleProfile,
  buildHzTopologyG6SearchFocus,
  buildHzTopologyG6SemanticClusterSummary,
  buildHzTopologyG6ShapeProfile,
  buildHzTopologyG6WindowedLaneGraph,
  clampHzTopologyG6AutoFitZoom,
  clampHzTopologyG6OperatorZoom,
  getHzTopologyG6NodeIcon,
  HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM,
  HZ_TOPOLOGY_G6_COMPACT_INITIAL_ZOOM,
  HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM,
  HZ_TOPOLOGY_G6_EDGE_LABEL_STAR_EDGE_LIMIT,
  HZ_TOPOLOGY_G6_EDGE_LABEL_VISIBLE_EDGE_LIMIT,
  HZ_TOPOLOGY_G6_MAX_ZOOM,
  HZ_TOPOLOGY_G6_NODE_ICON_CATALOG,
  HzTopologyG6Canvas,
  resolveHzTopologyG6EdgeLabelPolicy
} from './topology-g6';

const topologyG6Source = readFileSync(new URL('./topology-g6.tsx', import.meta.url), 'utf8');

function textFromCodePoints(...codePoints: number[]) {
  return String.fromCodePoint(...codePoints);
}

const nodeOnlyLocalizedExplanation =
  textFromCodePoints(0x4ec5, 0x5b9e, 0x4f53) + ' · ' + textFromCodePoints(0x6682, 0x65e0, 0x5173, 0x7cfb, 0x8fb9);

describe('@hertzbeat/ui topology G6 canvas', () => {
  const graph = {
    nodes: [
      {
        id: 'svc-checkout',
        label: 'Checkout API',
        entityType: 'service',
        health: 'warning',
        tone: 'warning',
        focus: 'active',
        source: 'otlp-trace-call',
        evidenceBadges: ['trace', 'relation'],
        redMetrics: { requestRatePerSecond: 12.34, errorRate: 0.042, latencyP95Ms: 180 },
        href: '/entities/svc-checkout'
      },
      {
        id: 'db-orders',
        label: 'Orders DB',
        entityType: 'database',
        health: 'critical',
        tone: 'danger',
        focus: 'related',
        source: 'database-middleware-connection',
        evidenceBadges: ['db'],
        redMetrics: { requestRatePerSecond: 7.25, errorRate: 0.11, latencyP95Ms: 320 }
      }
    ],
    edges: [
      {
        id: 'svc-checkout--db-orders',
        from: 'svc-checkout',
        to: 'db-orders',
        label: 'database connection',
        relationshipType: 'database-connection',
        source: 'database-middleware-connection',
        tone: 'red',
        focus: 'active-path',
        selected: true,
        evidenceBadges: ['trace', 'db'],
        redMetrics: { requestRatePerSecond: 7.25, errorRate: 0.11, latencyP95Ms: 320 },
        href: '/topology?edgeId=svc-checkout--db-orders'
      }
    ]
  };

  it('maps HertzBeat topology graph data into styled AntV G6 nodes and edges', () => {
    const g6Graph = buildHzTopologyG6Graph(graph);

    expect(g6Graph.nodes).toHaveLength(2);
    expect(g6Graph.edges).toHaveLength(1);
    expect(g6Graph.nodes[0]).toMatchObject({
      id: 'svc-checkout',
      type: 'circle',
      states: ['selected'],
      data: expect.objectContaining({
        entityType: 'service',
        iconLibrary: 'lucide-react',
        iconLabel: 'Service',
        iconName: 'server-cog',
        iconSource: 'entity-type-catalog',
        nodeShape: 'circle-icon-label',
        requestRatePerSecond: 12.34,
        source: 'otlp-trace-call'
      })
    });
    expect(g6Graph.nodes[0].style).toMatchObject({
      size: 54,
      iconSrc: expect.stringContaining('data:image/svg+xml'),
      labelText: 'Checkout API',
      labelPlacement: 'bottom',
      stroke: '#f59e0b'
    });
    expect(g6Graph.nodes[0].style).not.toHaveProperty('iconText');
    expect(g6Graph.edges[0].style?.labelText).toContain('/s');
    expect(g6Graph.nodes[1]).toMatchObject({
      type: 'circle',
      data: expect.objectContaining({
        entityType: 'database',
        iconLibrary: 'lucide-react',
        iconLabel: 'Database',
        iconName: 'database',
        iconSource: 'entity-type-catalog',
        nodeShape: 'circle-icon-label'
      })
    });
    expect(g6Graph.nodes[1].style).toMatchObject({
      iconSrc: expect.stringContaining('data:image/svg+xml'),
      labelText: 'Orders DB',
      labelPlacement: 'bottom'
    });
    expect(g6Graph.nodes[1].style).not.toHaveProperty('iconText');
    expect(g6Graph.edges[0]).toMatchObject({
      id: 'svc-checkout--db-orders',
      source: 'svc-checkout',
      target: 'db-orders',
      type: 'cubic-horizontal',
      states: ['selected']
    });
    expect(g6Graph.edges[0].style).toMatchObject({
      stroke: '#ef4444',
      endArrow: true
    });
  });

  it('truncates long node labels in the canvas while preserving full metadata for inspection', () => {
    const longLabel = 'codex-pd-1226-checkout-20260702065618';
    const g6Graph = buildHzTopologyG6Graph({
      nodes: [
        {
          id: 'svc-long',
          label: longLabel,
          entityType: 'service',
          health: 'degraded',
          tone: 'warning',
          source: 'otlp-trace-call'
        }
      ],
      edges: []
    });

    expect(g6Graph.nodes[0].data).toMatchObject({
      label: longLabel,
      displayLabel: 'codex-pd-1226-checkou...',
      labelDisplayPolicy: 'tail-truncate-preserve-metadata'
    });
    expect(g6Graph.nodes[0].style?.labelText).toBe('codex-pd-1226-checkou...');
  });

  it('uses a shared Lucide node icon catalog for supported topology entity types', () => {
    expect(HZ_TOPOLOGY_G6_NODE_ICON_CATALOG.map(item => [item.kind, item.iconName, item.label])).toEqual([
      ['application', 'app-window', 'Application'],
      ['service', 'server-cog', 'Service'],
      ['endpoint', 'route', 'Endpoint'],
      ['database', 'database', 'Database'],
      ['cache', 'memory-stick', 'Cache'],
      ['queue', 'inbox', 'Queue'],
      ['middleware', 'workflow', 'Middleware'],
      ['k8s-workload', 'container', 'Workload'],
      ['monitor', 'activity', 'Monitor'],
      ['resource', 'server', 'Resource'],
      ['alert', 'triangle-alert', 'Alert'],
      ['unknown', 'circle-help', 'Unknown']
    ]);

    expect(getHzTopologyG6NodeIcon('service')).toMatchObject({ kind: 'service', iconName: 'server-cog' });
    expect(getHzTopologyG6NodeIcon('payment-api')).toMatchObject({ kind: 'service', iconName: 'server-cog' });
    expect(getHzTopologyG6NodeIcon('http-endpoint')).toMatchObject({ kind: 'endpoint', iconName: 'route' });
    expect(getHzTopologyG6NodeIcon('/api/checkout')).toMatchObject({ kind: 'endpoint', iconName: 'route' });
    expect(getHzTopologyG6NodeIcon('orders-db')).toMatchObject({ kind: 'database', iconName: 'database' });
    expect(getHzTopologyG6NodeIcon('redis-cache')).toMatchObject({ kind: 'cache', iconName: 'memory-stick' });
    expect(getHzTopologyG6NodeIcon('kafka-events-queue')).toMatchObject({ kind: 'queue', iconName: 'inbox' });
    expect(getHzTopologyG6NodeIcon('middleware')).toMatchObject({ kind: 'middleware', iconName: 'workflow' });
    expect(getHzTopologyG6NodeIcon('k8s-workload')).toMatchObject({ kind: 'k8s-workload', iconName: 'container' });
    expect(getHzTopologyG6NodeIcon('monitor-bind')).toMatchObject({ kind: 'monitor', iconName: 'activity' });
    expect(getHzTopologyG6NodeIcon('linux-host')).toMatchObject({ kind: 'resource', iconName: 'server' });
    expect(getHzTopologyG6NodeIcon('alert-impact')).toMatchObject({ kind: 'alert', iconName: 'triangle-alert' });
    expect(getHzTopologyG6NodeIcon('custom-thing')).toMatchObject({ kind: 'unknown', iconName: 'circle-help' });
    expect(getHzTopologyG6NodeIcon('database').iconSrc).toContain('data:image/svg+xml');
  });

  it('computes upstream, downstream, and dimmed G6 neighbor focus roles', () => {
    const focus = buildHzTopologyG6NeighborFocus(
      {
        nodes: [
          { id: 'svc-web', label: 'Web', entityType: 'service' },
          { id: 'svc-checkout', label: 'Checkout API', entityType: 'service' },
          { id: 'svc-payment', label: 'Payment API', entityType: 'service' },
          { id: 'db-orders', label: 'Orders DB', entityType: 'database' },
          { id: 'queue-events', label: 'Events Queue', entityType: 'middleware' }
        ],
        edges: [
          { id: 'web-checkout', from: 'svc-web', to: 'svc-checkout' },
          { id: 'checkout-payment', from: 'svc-checkout', to: 'svc-payment' },
          { id: 'orders-events', from: 'db-orders', to: 'queue-events' }
        ]
      },
      { selectedNodeId: 'svc-checkout' }
    );

    expect(focus).toMatchObject({
      focusNodeId: 'svc-checkout',
      focusEdgeId: undefined,
      upstreamNodeIds: ['svc-web'],
      downstreamNodeIds: ['svc-payment'],
      incomingEdgeIds: ['web-checkout'],
      outgoingEdgeIds: ['checkout-payment'],
      dimmedNodeIds: ['db-orders', 'queue-events'],
      dimmedEdgeIds: ['orders-events'],
      nodeRoles: {
        'svc-web': 'upstream',
        'svc-checkout': 'focus',
        'svc-payment': 'downstream',
        'db-orders': 'dimmed',
        'queue-events': 'dimmed'
      },
      edgeRoles: {
        'web-checkout': 'incoming',
        'checkout-payment': 'outgoing',
        'orders-events': 'dimmed'
      }
    });
  });

  it('prefers hovered graph elements for G6 neighbor focus before selected drawer scope', () => {
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={{
          nodes: [
            { id: 'svc-web', label: 'Web', entityType: 'service' },
            { id: 'svc-checkout', label: 'Checkout API', entityType: 'service' },
            { id: 'svc-payment', label: 'Payment API', entityType: 'service' },
            { id: 'queue-events', label: 'Events Queue', entityType: 'middleware' }
          ],
          edges: [
            { id: 'web-checkout', from: 'svc-web', to: 'svc-checkout' },
            { id: 'checkout-payment', from: 'svc-checkout', to: 'svc-payment' },
            { id: 'checkout-events', from: 'svc-checkout', to: 'queue-events' }
          ]
        }}
        selectedNodeId="svc-payment"
        selectedEdgeId="web-checkout"
        hoveredEdgeId="checkout-events"
      />
    );

    expect(html).toContain('data-hz-topology-g6-hover-owner="hertzbeat-ui-g6-hover"');
    expect(html).toContain('data-hz-topology-g6-hover-source="edge"');
    expect(html).toContain('data-hz-topology-g6-hovered-node="none"');
    expect(html).toContain('data-hz-topology-g6-hovered-edge="checkout-events"');
    expect(html).toContain('data-hz-topology-g6-active-focus-source="hover-edge"');
    expect(html).toContain('data-hz-topology-g6-focused-node="none"');
    expect(html).toContain('data-hz-topology-g6-focused-edge="checkout-events"');
    expect(html).toContain('data-hz-topology-g6-upstream-node-count="1"');
    expect(html).toContain('data-hz-topology-g6-downstream-node-count="1"');
    expect(html).toContain('data-hz-topology-g6-selected-edge-count="1"');
    expect(html).toContain('data-hz-topology-g6-neighbor-role="selected"');
    expect(html).toContain('data-hz-topology-g6-neighbor-role="dimmed"');
  });

  it('registers AntV G6 pointer hover events for shared neighbor highlighting', () => {
    const source = String(HzTopologyG6Canvas);

    expect(source).toContain('node:pointerover');
    expect(source).toContain('edge:pointerover');
    expect(source).toContain('node:pointerleave');
    expect(source).toContain('edge:pointerleave');
    expect(source).toContain('setHoveredElement');
    expect(source).toContain('onNodeHoverRef.current?.(String(id), readG6EventAnchor(event, stage))');
    expect(source).toContain('onEdgeHoverRef.current?.(String(id), readG6EventAnchor(event, stage))');
    expect(source).toContain('onHoverClearRef.current?.()');
  });

  it('keeps G6 edge hover and click targets wide enough for real mouse selection', () => {
    const source = `${String(HzTopologyG6Canvas)} ${String(buildHzTopologyG6Graph)}`;
    const graphData = buildHzTopologyG6Graph(graph);
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} selectedNodeId="svc-checkout" />);

    expect(html).toContain('data-hz-topology-g6-edge-hit-target="wide-pointer-band"');
    expect(html).toContain('data-hz-topology-g6-edge-hit-target-owner="hertzbeat-ui-g6-edge-hit-target"');
    expect(html).toContain('data-hz-topology-g6-rendered-node-count="2"');
    expect(html).toContain('data-hz-topology-g6-rendered-edge-count="1"');
    expect(html).toContain('data-hz-topology-g6-rendered-edge-owner="hertzbeat-ui-g6-rendered-edge-proof"');
    expect(source).toContain('increasedLineWidthForHitTesting');
    expect(source).toContain('readG6EventId(event)');
    expect(graphData.edges[0]?.style).toMatchObject({ increasedLineWidthForHitTesting: expect.any(Number) });
    expect(Number(graphData.edges[0]?.style.increasedLineWidthForHitTesting)).toBeGreaterThanOrEqual(14);
  });

  it('clears shared hover state when the pointer leaves the G6 canvas boundary', () => {
    const source = String(HzTopologyG6Canvas);

    expect(source).toContain('clearSharedHover');
    expect(source).toContain('handleG6CanvasPointerLeave');
    expect(source).toContain('handleG6DocumentPointerMoveHoverBoundary');
    expect(source).toContain('document.addEventListener("pointermove", handleG6DocumentPointerMoveHoverBoundary)');
    expect(source).toContain('document.removeEventListener("pointermove", handleG6DocumentPointerMoveHoverBoundary)');
    expect(source).toContain('rootRef.current?.getBoundingClientRect()');
    expect(source).toContain('onPointerLeave: handleG6CanvasPointerLeave');
    expect(source).toContain('"data-hz-topology-g6-hover-clear": "canvas-boundary"');
    expect(source).toContain('"data-hz-topology-g6-hover-clear-fallback": "document-boundary-pointermove"');
    expect(source).toContain('"data-hz-topology-g6-hover-clear-selection-continuity": "next-edge-click-selects-rendered-edge"');
    expect(source).toContain('"data-hz-topology-g6-hover-clear-selection-invariants": "cleared-hover next-edge-click no-url-change no-remount no-refit viewport-preserved render-key-stable"');
  });

  it('clears stale hover evidence before node or edge drawer selection', () => {
    const source = String(HzTopologyG6Canvas);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas graph={graph} selectedNodeId="svc-checkout" selectedEdgeId="svc-checkout--db-orders" />
    );

    expect(html).toContain('data-hz-topology-g6-selection-clear="hover"');
    expect(html).toContain('data-hz-topology-g6-edge-to-edge-selection-continuity="adjacent-edge-click-updates-selection-and-summary"');
    expect(html).toContain('data-hz-topology-g6-edge-to-edge-selection-invariants="edge-click edge-click no-stale-hover summary-selected-match no-url-change no-remount no-refit viewport-preserved render-key-stable"');
    expect(html).toContain('data-hz-topology-g6-node-edge-selection-continuity="node-click-clears-edge edge-click-clears-node"');
    expect(html).toContain('data-hz-topology-g6-node-edge-selection-invariants="edge-node node-edge clear-opposite-selection clear-stale-hover no-url-change no-remount no-refit viewport-preserved render-key-stable"');
    expect(html).toContain('data-hz-topology-g6-selected-edge-node-hover-continuity="selected-edge-survives-node-hover"');
    expect(html).toContain('data-hz-topology-g6-selected-edge-node-hover-invariants="selected-edge path-summary-selected node-hover-no-summary-overwrite pointer-leave-clears-hover no-url-change no-remount no-refit viewport-preserved render-key-stable"');
    expect(html).toContain('data-hz-topology-g6-selected-node-edge-hover-continuity="selected-node-survives-edge-hover"');
    expect(html).toContain('data-hz-topology-g6-selected-node-edge-hover-invariants="selected-node edge-hover-no-node-overwrite edge-hover-no-url-change pointer-leave-clears-hover no-remount no-refit viewport-preserved render-key-stable"');
    expect(source).toContain('handleG6NodeSelect');
    expect(source).toContain('handleG6EdgeSelect');
    expect(source).toContain('handleG6NodeSelect(String(id))');
    expect(source).toContain('handleG6EdgeSelect(String(id))');
    expect(source).toContain('clearSharedHover();');
  });

  it('keeps metadata node and edge clicks inside the shared G6 selection model', () => {
    const source = String(HzTopologyG6Canvas);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={{
          nodes: [
            {
              id: 'svc-checkout',
              label: 'Checkout API',
              entityType: 'service',
              href: '/topology?entityId=501&depth=2'
            },
            {
              id: 'svc-payment',
              label: 'Payment API',
              entityType: 'service',
              href: '/topology?entityId=502&depth=2'
            }
          ],
          edges: [
            {
              id: 'svc-checkout--svc-payment',
              source: 'otlp-trace-call',
              sourceNodeId: 'svc-checkout',
              targetNodeId: 'svc-payment',
              relationshipType: 'trace-call',
              href: '/topology?edgeId=svc-checkout--svc-payment'
            }
          ]
        }}
      />
    );

    expect(source).toContain('handleMetadataNodeClick');
    expect(source).toContain('handleMetadataEdgeClick');
    expect(source).toContain('event.preventDefault();');
    expect(source).toContain('handleG6NodeSelect(nodeId);');
    expect(source).toContain('handleG6EdgeSelect(edgeId);');
    expect(source).not.toContain("href={node.href ?? '#'}");
    expect(source).not.toContain("href={edge.href ?? '#'}");
    expect(html).toContain('<button type="button"');
    expect(html).toContain('data-hz-topology-g6-metadata-role="selection-button"');
    expect(html).toContain('data-hz-topology-g6-metadata-tab-policy="excluded-from-sequential-focus"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('data-hz-topology-g6-metadata-click-behavior="in-page-select"');
    expect(html).toContain('data-hz-topology-g6-metadata-click-target="node"');
    expect(html).toContain('data-hz-topology-g6-metadata-click-target="edge"');
    expect(html).toContain('data-topology-node-select-mode="in-page-drawer"');
    expect(html).toContain('data-topology-node-select-url-policy="preserve-current-url"');
    expect(html).not.toContain('data-topology-node-select-href=');
  });

  it('registers node double click as the shared focused 1-hop entry without replacing drawer click selection', () => {
    const source = String(HzTopologyG6Canvas);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={{
          nodes: [
            {
              id: 'svc-checkout',
              label: 'Checkout API',
              entityType: 'service',
              href: '/topology?entityId=501&depth=2',
              focusHref: '/topology?entityId=501&depth=1'
            }
          ],
          edges: []
        }}
      />
    );

    expect(source).toContain('node:dblclick');
    expect(source).toContain('handleG6NodeFocus');
    expect(source).toContain('onNodeFocusRef.current?.(nodeId);');
    expect(html).toContain('data-hz-topology-g6-focus-entry="double-click-node"');
    expect(html).toContain('data-hz-topology-g6-focus-entry-owner="hertzbeat-ui-g6-focus-entry"');
    expect(html).toContain('data-hz-topology-g6-focus-depth-target="1-hop"');
    expect(html).toContain('data-hz-topology-g6-node-focus-owner="hertzbeat-ui-g6-node-focus"');
    expect(html).toContain('data-topology-node-select-mode="in-page-drawer"');
    expect(html).toContain('data-topology-node-select-url-policy="preserve-current-url"');
    expect(html).not.toContain('data-topology-node-select-href=');
    expect(html).toContain('data-topology-node-focus-href="/topology?entityId=501&amp;depth=1"');
  });

  it('schedules a post-render overflow-only fit pass so small graphs are not magnified on first paint', () => {
    const source = topologyG6Source;
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} />);

    expect(source).toContain('buildHzTopologyG6InitialFitStrategy');
    expect(source).toContain('initialFitStrategy === "center-only"');
    expect(source).toContain('centerOnlyG6Viewport');
    expect(source).toContain('scheduleInitialFitView');
    expect(source).toContain('fitAndCenterG6Viewport');
    expect(source).toContain("fitAndCenterG6Viewport(runtimeGraph, { when: 'overflow' }, false)");
    expect(source).toContain("fitAndCenterG6Viewport(runtimeGraph, { when: 'overflow' }, { duration: 120 })");
    expect(source).not.toContain("fitAndCenterG6Viewport(runtimeGraph, { when: 'always' }, false)");
    expect(source).not.toContain("fitAndCenterG6Viewport(runtimeGraph, { when: 'always' }, { duration: 120 })");
    expect(source).not.toContain("runtimeGraph.fitView?.({ when: 'always' }, false);\n        await runtimeGraph.fitCenter?.(false);");
    expect(html).toContain('data-hz-topology-g6-auto-fit-zoom-bounds="0.18-1"');
    expect(html).toContain('data-hz-topology-g6-auto-fit-max-zoom="1"');
    expect(html).toContain('data-hz-topology-g6-auto-fit-growth="no-magnify-small-graphs"');
    expect(html).toContain('data-hz-topology-g6-auto-fit-zoom-range-owner="hertzbeat-ui-g6-auto-fit-zoom-range"');
    expect(html).toContain('data-hz-topology-g6-initial-fit-strategy="center-only"');
    expect(html).toContain('data-hz-topology-g6-initial-fit-strategy-owner="hertzbeat-ui-g6-initial-fit-strategy"');
    expect(html).toContain(`data-hz-topology-g6-operator-zoom-bounds="0.18-${HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM}"`);
    expect(html).toContain('data-hz-topology-g6-operator-zoom-growth="bounded-readable-nodes"');
    expect(html).toContain('data-hz-topology-g6-fit-mode="overflow-only-center"');
    expect(clampHzTopologyG6AutoFitZoom(4.8)).toBe(HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM);
    expect(clampHzTopologyG6AutoFitZoom(0.72)).toBe(0.72);
    expect(source).toContain('withG6AutoFitZoomRange(runtimeGraph, async () => {');
    expect(source).toContain('runtimeGraph.setZoomRange?.([HZ_TOPOLOGY_G6_MIN_ZOOM, HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM])');
    expect(source).toContain('runtimeGraph.setZoomRange?.([HZ_TOPOLOGY_G6_MIN_ZOOM, HZ_TOPOLOGY_G6_MAX_ZOOM])');
  });

  it('keeps compact service graphs at readable one-to-one scale instead of fitting them to fill wide canvases', () => {
    const compactGraph = buildHzTopologyG6ScaleFixture(7);
    const denseGraph = buildHzTopologyG6ScaleFixture(50);
    const compactHtml = renderToStaticMarkup(<HzTopologyG6Canvas graph={compactGraph} />);
    const denseHtml = renderToStaticMarkup(<HzTopologyG6Canvas graph={denseGraph} />);

    expect(buildHzTopologyG6InitialFitStrategy(compactGraph)).toBe('center-only');
    expect(buildHzTopologyG6InitialFitStrategy(denseGraph)).toBe('overflow-fit');
    expect(compactHtml).toContain('data-hz-topology-g6-initial-fit-strategy="center-only"');
    expect(denseHtml).toContain('data-hz-topology-g6-initial-fit-strategy="overflow-fit"');
  });

  it('caps compact service graph operator zoom below the wide-browser giant-node range', () => {
    const source = topologyG6Source;
    const compactGraph = buildHzTopologyG6ScaleFixture(7);
    const denseGraph = buildHzTopologyG6ScaleFixture(50);
    const compactHtml = renderToStaticMarkup(<HzTopologyG6Canvas graph={compactGraph} />);
    const denseHtml = renderToStaticMarkup(<HzTopologyG6Canvas graph={denseGraph} />);

    expect(HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM).toBeLessThan(HZ_TOPOLOGY_G6_MAX_ZOOM);
    expect(buildHzTopologyG6OperatorMaxZoom('center-only')).toBe(HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM);
    expect(buildHzTopologyG6OperatorMaxZoom('overflow-fit')).toBe(HZ_TOPOLOGY_G6_MAX_ZOOM);
    expect(compactHtml).toContain(`data-hz-topology-g6-operator-zoom-bounds="0.18-${HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM}"`);
    expect(compactHtml).toContain('data-hz-topology-g6-operator-zoom-tier="compact-readable"');
    expect(compactHtml).toContain(`data-hz-topology-g6-wheel-zoom-bounds="0.18-${HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM}"`);
    expect(denseHtml).toContain(`data-hz-topology-g6-operator-zoom-bounds="0.18-${HZ_TOPOLOGY_G6_MAX_ZOOM}"`);
    expect(denseHtml).toContain('data-hz-topology-g6-operator-zoom-tier="full-canvas"');
    expect(source).toContain('const operatorMaxZoom = buildHzTopologyG6OperatorMaxZoom(initialFitStrategy)');
    expect(source).toContain('Math.min(operatorMaxZoom, currentZoom * wheelScale)');
    expect(source).toContain('Math.min(operatorMaxZoom, currentZoom * scale)');
  });

  it('clamps restored compact viewport snapshots so stale wide-browser zoom cannot survive redraw or resize', () => {
    const source = topologyG6Source;
    const compactGraph = buildHzTopologyG6ScaleFixture(7);
    const compactHtml = renderToStaticMarkup(<HzTopologyG6Canvas graph={compactGraph} />);

    expect(clampHzTopologyG6OperatorZoom(4.8, HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM)).toBe(HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM);
    expect(clampHzTopologyG6OperatorZoom(0.12, HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM)).toBe(0.18);
    expect(clampHzTopologyG6OperatorZoom(1.12, HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM)).toBe(1.12);
    expect(compactHtml).toContain('data-hz-topology-g6-viewport-restore-clamp="operator-max"');
    expect(source).toContain('restoreG6ViewportSnapshot(runtimeGraph, resizeSnapshot, runtimeMaxZoom)');
    expect(source).toContain('restoreG6ViewportSnapshot(runtimeGraph, snapshot, runtimeMaxZoom)');
    expect(source).toContain('const clampedZoom = clampHzTopologyG6OperatorZoom(snapshot.zoom, maxZoom)');
    expect(source).not.toContain('await runtimeGraph.zoomTo?.(snapshot.zoom, false)');
  });

  it('clamps an already-mounted compact runtime zoom so stale normal-browser zoom cannot keep giant nodes visible', () => {
    const source = topologyG6Source;
    const compactHtml = renderToStaticMarkup(<HzTopologyG6Canvas graph={buildHzTopologyG6ScaleFixture(7)} />);

    expect(compactHtml).toContain('data-hz-topology-g6-live-zoom-guard="operator-max"');
    expect(compactHtml).toContain('data-hz-topology-g6-live-zoom-guard-owner="hertzbeat-ui-g6-live-zoom-guard"');
    expect(source).toContain('async function enforceG6OperatorZoomBounds');
    expect(source).toContain('const runtimeMaxZoom = buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current)');
    expect(source).toContain('enforceG6OperatorZoomBounds(runtimeGraph, runtimeMaxZoom)');
    expect(source).toContain('const runtimeGraph = graphRef.current;');
  });

  it('keeps compact graphs at 1x before the operator intentionally zooms', () => {
    const source = topologyG6Source;
    const compactHtml = renderToStaticMarkup(<HzTopologyG6Canvas graph={buildHzTopologyG6ScaleFixture(7)} />);

    expect(buildHzTopologyG6RuntimeMaxZoom('center-only', false)).toBe(HZ_TOPOLOGY_G6_COMPACT_INITIAL_ZOOM);
    expect(buildHzTopologyG6RuntimeMaxZoom('center-only', true)).toBe(HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM);
    expect(buildHzTopologyG6RuntimeMaxZoom('overflow-fit', false)).toBe(HZ_TOPOLOGY_G6_MAX_ZOOM);
    expect(compactHtml).toContain('data-hz-topology-g6-preinteraction-zoom-guard="compact-1x"');
    expect(compactHtml).toContain('data-hz-topology-g6-preinteraction-zoom-guard-owner="hertzbeat-ui-g6-preinteraction-zoom-guard"');
    expect(source).toContain('buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current)');
    expect(source).toContain('enforceG6OperatorZoomBounds(runtimeGraph, runtimeMaxZoom)');
  });

  it('rechecks compact runtime zoom when a normal browser tab returns from stale focus or hot reload state', () => {
    const source = topologyG6Source;
    const compactHtml = renderToStaticMarkup(<HzTopologyG6Canvas graph={buildHzTopologyG6ScaleFixture(7)} />);

    expect(compactHtml).toContain('data-hz-topology-g6-runtime-version="compact-viewport-guard-v3"');
    expect(compactHtml).toContain('data-hz-topology-g6-runtime-version-owner="hertzbeat-ui-g6-runtime-version"');
    expect(compactHtml).toContain('data-hz-topology-g6-browser-resume-zoom-guard="operator-max"');
    expect(source).toContain('const HZ_TOPOLOGY_G6_VIEWPORT_RUNTIME_VERSION = "compact-viewport-guard-v3"');
    expect(source).toContain('const viewportRuntimeVersion = HZ_TOPOLOGY_G6_VIEWPORT_RUNTIME_VERSION');
    expect(source).toContain('document.addEventListener("visibilitychange", handleBrowserResumeZoomGuard)');
    expect(source).toContain('window.addEventListener("focus", handleBrowserResumeZoomGuard)');
    expect(source).toContain('document.removeEventListener("visibilitychange", handleBrowserResumeZoomGuard)');
    expect(source).toContain('window.removeEventListener("focus", handleBrowserResumeZoomGuard)');
  });

  it('keeps the compact center-only path ending with a hard 1x zoom clamp', () => {
    const source = topologyG6Source;
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={buildHzTopologyG6ScaleFixture(7)} />);
    const centerOnlyMatch = source.match(/async function centerOnlyG6Viewport[\s\S]*?\n}/);

    expect(html).toContain('data-hz-topology-g6-compact-final-zoom-clamp="true"');
    expect(html).toContain('data-hz-topology-g6-compact-fit-mode="center-1x-no-fill"');
    expect(html).toContain('data-hz-topology-g6-compact-initial-zoom="1"');
    expect(html).toContain('data-hz-topology-g6-normal-browser-stale-fit-guard="compact-1x-before-center"');
    expect(centerOnlyMatch?.[0]).toContain('HZ_TOPOLOGY_G6_COMPACT_INITIAL_ZOOM');
    expect(centerOnlyMatch?.[0]).toContain('runtimeGraph.zoomTo?.(HZ_TOPOLOGY_G6_COMPACT_INITIAL_ZOOM, false)');
    expect(centerOnlyMatch?.[0]).toContain('runtimeGraph.fitCenter?.(animation)');
    expect(centerOnlyMatch?.[0]).toContain('runtimeGraph.zoomTo?.(HZ_TOPOLOGY_G6_COMPACT_INITIAL_ZOOM, animation)');
    expect(centerOnlyMatch?.[0]).not.toContain('HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM');
  });

  it('hides the AntV stage until the initial compact fit has completed so wide browsers never show giant pre-fit nodes', () => {
    const source = topologyG6Source;
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={buildHzTopologyG6ScaleFixture(7)} />);

    expect(html).toContain('data-hz-topology-g6-initial-paint-policy="hide-stage-until-fit-ready"');
    expect(html).toContain('data-hz-topology-g6-stage-initial-paint="hidden-until-fit"');
    expect(html).toContain('data-hz-topology-g6-viewport-fit-state="pending"');
    expect(html).toContain('data-hz-topology-g6-viewport-fit-state-owner="hertzbeat-ui-g6-fit-settle-state"');
    expect(html).toContain('opacity-0');
    expect(source).toContain('const isViewportFitPending =');
    expect(source).toContain("const initialPaintVisibility = renderState === 'idle' || isViewportFitPending ? 'hidden-until-fit' : 'visible-after-fit'");
    expect(source).toContain("initialPaintVisibility === 'hidden-until-fit' ? 'opacity-0' : 'opacity-100'");
    expect(source).toContain("if (!disposed) setRenderState('ready');");
  });

  it('keeps a shared nonblank runtime loading layer visible while AntV G6 chunks are still loading', () => {
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} />);

    expect(html).toContain('data-hz-topology-g6-runtime-loading-layer="visible-until-g6-ready"');
    expect(html).toContain('data-hz-topology-g6-runtime-loading-owner="hertzbeat-ui-g6-runtime-loading"');
    expect(html).toContain('data-hz-topology-g6-runtime-loading-node-count="2"');
    expect(html).toContain('data-hz-topology-g6-runtime-loading-edge-count="1"');
    expect(html).toContain('data-hz-topology-g6-runtime-loading-icon-policy="none"');
    expect(html).toContain('data-hz-topology-g6-runtime-loading-no-handdrawn-icon="true"');
    expect(html).toContain('2 nodes · 1 edges');
  });

  it('centers the shared G6 canvas after fit and reset view actions', () => {
    const source = topologyG6Source;
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={buildHzTopologyG6ScaleFixture(8)} />);

    expect(source).toContain('centerGraphView');
    expect(source).toContain('if (initialFitStrategy === "center-only")');
    expect(source).toContain('centerOnlyG6Viewport(graphRef.current, { duration: 180 })');
    expect(source).toContain('centerGraphView("fit-view")');
    expect(source).toContain('centerGraphView("reset-view")');
    expect(source).toContain("fitAndCenterG6Viewport(graphRef.current, { when: 'overflow' }, { duration: 180 })");
    expect(source).not.toContain("fitAndCenterG6Viewport(graphRef.current, { when: 'always' }, { duration: 180 })");
    expect(html).toContain('data-hz-topology-g6-viewport-owner="hertzbeat-ui-g6-viewport"');
    expect(html).toContain('data-hz-topology-g6-fit-behavior="overflow-fit-and-center"');
    expect(html).toContain('data-hz-topology-g6-reset-behavior="zoom-one-overflow-fit-center"');
  });

  it('keeps operator zoom below the giant-node range that can make a small graph fill wide browsers', () => {
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} />);

    expect(html).toContain(`data-hz-topology-g6-operator-zoom-bounds="0.18-${HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM}"`);
    expect(html).toContain(`data-hz-topology-g6-wheel-zoom-bounds="0.18-${HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM}"`);
    expect(html).toContain('data-hz-topology-g6-operator-zoom-tier="compact-readable"');
    expect(html).toContain('data-hz-topology-g6-operator-zoom-growth="bounded-readable-nodes"');
    expect(HZ_TOPOLOGY_G6_MAX_ZOOM).toBe(2.2);
  });

  it('preserves operator wheel and pan zoom while hover or selection styling updates redraw the G6 graph', () => {
    const source = String(HzTopologyG6Canvas);
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} selectedNodeId="svc-checkout" />);

    expect(source).toContain('buildHzTopologyG6RenderKey');
    expect(source).toContain('lastDrawGraphKeyRef');
    expect(source).toContain('if (g6RenderKey === lastDrawGraphKeyRef.current) return;');
    expect(source).toContain('hoveredElementRef');
    expect(source).toContain('if (!hasSharedHover) return;');
    expect(source).toContain('buildHzTopologyG6StructureKey');
    expect(source).toContain('readG6EventAnchor');
    expect(source).toContain('onEdgeHoverRef.current?.(String(id), readG6EventAnchor(event, stage));');
    expect(source).toContain('onNodeHoverRef.current?.(String(id), readG6EventAnchor(event, stage));');
    expect(source).toContain('lastFitStructureKeyRef');
    expect(source).toContain('markUserViewportInteraction');
    expect(source).toContain('stage.addEventListener("wheel", handleG6WheelViewportControl, { passive: false })');
    expect(source).toContain('stage.addEventListener("pointerdown", handleG6PointerPanStart)');
    expect(source).toContain('stage.addEventListener("pointermove", handleG6PointerPanMove)');
    expect(source).toContain('restoreG6ViewportSnapshot(runtimeGraph, resizeSnapshot, runtimeMaxZoom)');
    expect(source).not.toContain("{ type: 'drag-element', key: 'drag-element' }");
    expect(source).not.toContain("{ type: 'click-select', key: 'click-select' }");
    expect(source).not.toContain("{ type: 'zoom-canvas', key: 'zoom-canvas'");
    expect(source).toContain('markUserViewportInteraction();');
    expect(source).toContain('setViewportInteractionState("operator-adjusted")');
    expect(source).toContain('const shouldFitAfterDataChange = graphStructureKey !== lastFitStructureKeyRef.current && !hasUserViewportInteractedRef.current;');
    expect(source).toContain('if (shouldFitAfterDataChange) {');
    expect(source).toContain('fitAndCenterG6Viewport(runtimeGraph, { when: "overflow" }, false)');
    expect(source).toContain('publishViewportTelemetry(clamped ? "runtime-zoom-guard" : "initial-fit")');
    expect(source).toContain('lastFitStructureKeyRef.current = graphStructureKey;');
    expect(source).toContain('autoFit: false');
    expect(source).not.toContain("autoFit: 'view'");
    expect(html).toContain('data-hz-topology-g6-auto-fit="initial-only"');
    expect(html).toContain('data-hz-topology-g6-auto-fit-owner="hertzbeat-ui-g6-auto-fit"');
    expect(html).toContain('data-hz-topology-g6-viewport-interaction-state="pristine"');
    expect(html).toContain('data-hz-topology-g6-viewport-interaction-owner="hertzbeat-ui-g6-viewport-interaction"');
    expect(html).toContain('data-hz-topology-g6-viewport-preservation="clamped-wheel-pan-zoom"');
    expect(html).toContain('data-hz-topology-g6-live-interaction-owner="hertzbeat-ui-g6-live-interaction"');
    expect(html).toContain('data-hz-topology-g6-live-interaction-invariants="no-url-change no-remount no-refit viewport-preserved render-key-stable"');
    expect(html).toContain('data-hz-topology-g6-edge-live-interaction-owner="hertzbeat-ui-g6-edge-live-interaction"');
    expect(html).toContain('data-hz-topology-g6-edge-live-interaction-invariants="edge-click-drawer no-url-change no-remount no-refit viewport-preserved render-key-stable"');
    expect(html).toContain('data-hz-topology-g6-style-redraw-behavior="no-auto-fit"');
    expect(html).toContain('data-hz-topology-g6-style-redraw-skip="identical-render-key"');
    expect(html).toContain('data-hz-topology-g6-blank-hover-clear="no-op-without-hover"');
    expect(html).toContain('data-hz-topology-g6-resize-preservation="operator-viewport-snapshot"');
    expect(html).toContain('data-hz-topology-g6-node-motion="locked-layout"');
    expect(html).toContain('data-hz-topology-g6-selection-engine="hertzbeat-controlled"');
  });

  it('keeps large graph pan under one manual owner so AntV drag-canvas cannot double-apply pointer movement', () => {
    const source = topologyG6Source;
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={buildHzTopologyG6ScaleFixture(500)} />);

    expect(buildHzTopologyG6PointerPanDelta({ x: -320.4, y: 165.6 })).toEqual([-320, 166]);
    expect(html).toContain('data-hz-topology-g6-pan-mode="manual-stage-drag-fallback"');
    expect(html).toContain('data-hz-topology-g6-pan-owner="hertzbeat-ui-g6-pan"');
    expect(html).toContain('data-hz-topology-g6-pan-runtime="manual-only-no-antv-double-pan"');
    expect(html).toContain('data-hz-topology-g6-pan-telemetry="pointer-drag-translateBy"');
    expect(html).toContain('data-hz-topology-g6-pan-selection-guard="drag-pan-suppresses-click-selection"');
    expect(html).toContain('data-hz-topology-g6-pan-selection-guard-owner="hertzbeat-ui-g6-pan-selection-guard"');
    expect(source).toContain('handleG6PointerPanStart');
    expect(source).toContain('handleG6PointerPanMove');
    expect(source).toContain('handleG6PointerPanEnd');
    expect(source).toContain('buildHzTopologyG6PointerPanDelta');
    expect(source).toContain('shouldSuppressG6SelectionAfterPointerPan');
    expect(source).toContain('pointerPanSelectionSuppressedUntilRef');
    expect(source).toContain('if (shouldSuppressG6SelectionAfterPointerPan()) return;');
    expect(source).toContain('runtimeGraph.translateBy?.(panDelta, false)');
    expect(source).not.toContain("{ type: 'drag-canvas', key: 'drag-canvas' }");
    expect(source).toContain('stage.addEventListener("pointermove", handleG6PointerPanMove)');
    expect(source).toContain('stage.addEventListener("pointerup", handleG6PointerPanEnd)');
    expect(source).toContain('stage.addEventListener("pointercancel", handleG6PointerPanEnd)');
  });

  it('builds deterministic 50, 200, and 500 node G6 scale fixtures with RED evidence', () => {
    const compact = buildHzTopologyG6ScaleFixture(50);
    const dense = buildHzTopologyG6ScaleFixture(200);
    const stress = buildHzTopologyG6ScaleFixture(500);

    expect(compact.nodes).toHaveLength(50);
    expect(dense.nodes).toHaveLength(200);
    expect(stress.nodes).toHaveLength(500);
    expect(compact.edges.length).toBeGreaterThan(50);
    expect(dense.edges.length).toBeGreaterThan(200);
    expect(stress.edges.length).toBeGreaterThan(500);
    expect(compact.nodes[0]).toMatchObject({
      id: 'scale-svc-000',
      entityType: 'service',
      source: 'otlp-trace-call',
      evidenceBadges: ['trace', 'scale-fixture'],
      redMetrics: expect.objectContaining({
        requestRatePerSecond: expect.any(Number),
        errorRate: expect.any(Number),
        latencyP95Ms: expect.any(Number)
      })
    });
    expect(stress.edges[0]).toMatchObject({
      id: 'scale-edge-000-001',
      from: 'scale-svc-000',
      to: 'scale-svc-001',
      relationshipType: 'trace-call',
      source: 'otlp-trace-call',
      evidenceBadges: ['trace', 'scale-fixture'],
      redMetrics: expect.objectContaining({
        requestRatePerSecond: expect.any(Number),
        errorRate: expect.any(Number),
        latencyP95Ms: expect.any(Number)
      })
    });
  });

  it('classifies mixed star and mesh topology shape so scale proofs do not masquerade as a single relation', () => {
    const mixedShapeGraph = {
      nodes: [
        { id: 'gateway', label: 'Gateway', entityType: 'service', source: 'otlp-trace-call' },
        ...Array.from({ length: 10 }, (_, index) => ({
          id: `leaf-${index}`,
          label: `Leaf ${index}`,
          entityType: 'service',
          source: 'otlp-trace-call'
        })),
        ...Array.from({ length: 4 }, (_, index) => ({
          id: `mesh-${index}`,
          label: `Mesh ${index}`,
          entityType: 'service',
          source: 'otlp-trace-call'
        }))
      ],
      edges: [
        ...Array.from({ length: 10 }, (_, index) => ({
          id: `gateway-leaf-${index}`,
          from: 'gateway',
          to: `leaf-${index}`,
          relationshipType: 'trace-call',
          source: 'otlp-trace-call'
        })),
        { id: 'mesh-0-1', from: 'mesh-0', to: 'mesh-1', relationshipType: 'trace-call', source: 'otlp-trace-call' },
        { id: 'mesh-1-2', from: 'mesh-1', to: 'mesh-2', relationshipType: 'trace-call', source: 'otlp-trace-call' },
        { id: 'mesh-2-3', from: 'mesh-2', to: 'mesh-3', relationshipType: 'trace-call', source: 'otlp-trace-call' },
        { id: 'mesh-3-0', from: 'mesh-3', to: 'mesh-0', relationshipType: 'trace-call', source: 'otlp-trace-call' }
      ]
    };

    const shapeProfile = buildHzTopologyG6ShapeProfile(mixedShapeGraph);

    expect(shapeProfile).toMatchObject({
      shape: 'mixed-star-mesh',
      hubNodeCount: 1,
      starEdgeCount: 10,
      meshEdgeCount: 4,
      evidence: 'degree-derived'
    });
  });

  it('hides canvas edge labels for high fan-out trace-call stars while keeping edge evidence inspectable', () => {
    const starGraph = {
      nodes: [
        { id: 'gateway', label: 'Gateway', entityType: 'service', source: 'otlp-trace-call' },
        ...Array.from({ length: 40 }, (_, index) => ({
          id: `backend-${index}`,
          label: `Backend ${index}`,
          entityType: 'service',
          source: 'otlp-trace-call'
        }))
      ],
      edges: Array.from({ length: 40 }, (_, index) => ({
        id: `gateway-backend-${index}`,
        from: 'gateway',
        to: `backend-${index}`,
        relationshipType: 'trace-call',
        source: 'otlp-trace-call',
        redMetrics: { requestRatePerSecond: 0.0075, requestCount: 3, errorRate: 0, latencyP95Ms: 315 }
      }))
    };
    const renderWindow = buildHzTopologyG6RenderWindow(starGraph);
    const shapeProfile = buildHzTopologyG6ShapeProfile(renderWindow.graph);
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={starGraph} height="compact" />);

    expect(shapeProfile).toMatchObject({
      shape: 'single-star',
      starEdgeCount: 40
    });
    expect(HZ_TOPOLOGY_G6_EDGE_LABEL_STAR_EDGE_LIMIT).toBeLessThan(40);
    expect(resolveHzTopologyG6EdgeLabelPolicy(renderWindow, shapeProfile)).toBe('hidden-large-graph');
    expect(html).toContain('data-hz-topology-g6-node-count="41"');
    expect(html).toContain('data-hz-topology-g6-edge-count="40"');
    expect(html).toContain('data-hz-topology-g6-edge-label-policy="hidden-large-graph"');
    expect(html).toContain('data-hz-topology-g6-edge-label-visible-count="0"');
    expect(html).toContain('data-hz-topology-g6-edge-label-hidden-count="40"');
    expect(html).toContain(`data-hz-topology-g6-edge-label-star-threshold="${HZ_TOPOLOGY_G6_EDGE_LABEL_STAR_EDGE_LIMIT}"`);
    expect(html).toContain('data-hz-topology-g6-shape-profile="single-star"');
    expect(html).toContain('data-hz-topology-g6-shape-profile-star-edge-count="40"');
    expect(html).toContain('data-topology-edge-request-rate="0.0075"');
    expect(html).toContain('>0.0075/s · 0%');
  });

  it('exposes scale-tier metadata on shared G6 canvas SSR shells', () => {
    const scaleGraph = buildHzTopologyG6ScaleFixture(200);
    const profile = buildHzTopologyG6ScaleProfile(scaleGraph);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={scaleGraph}
        selectedNodeId="scale-svc-000"
        layout="force"
        height="compact"
        summaryLabel={`${profile.nodeCount} nodes · ${profile.edgeCount} edges`}
      />
    );

    expect(profile).toMatchObject({
      nodeCount: 200,
      scaleTier: 'dense',
      layoutHint: 'force'
    });
    expect(html).toContain('data-hz-topology-g6-scale-owner="hertzbeat-ui-g6-scale"');
    expect(html).toContain('data-hz-topology-g6-scale-tier="dense"');
    expect(html).toContain('data-hz-topology-g6-scale-node-count="200"');
    expect(html).toContain(`data-hz-topology-g6-scale-edge-count="${profile.edgeCount}"`);
    expect(html).toContain('data-hz-topology-g6-scale-layout-hint="force"');
    expect(html).toContain('200 nodes');
  });

  it('exposes dense and stress large-graph strategy metadata for grouping and filtering', () => {
    const denseGraph = buildHzTopologyG6ScaleFixture(200);
    const stressGraph = buildHzTopologyG6ScaleFixture(500);
    const denseStrategy = buildHzTopologyG6LargeGraphStrategy(denseGraph);
    const stressStrategy = buildHzTopologyG6LargeGraphStrategy(stressGraph);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={stressGraph}
        selectedNodeId="scale-svc-000"
        layout="force"
        height="compact"
        summaryLabel={`${stressStrategy.nodeCount} nodes · ${stressStrategy.edgeCount} edges`}
      />
    );

    expect(denseStrategy).toMatchObject({
      nodeCount: 200,
      strategy: 'force-with-grouping',
      recommendedLayout: 'force',
      grouping: 'recommended',
      filtering: 'recommended',
      tableCompanion: 'recommended'
    });
    expect(stressStrategy).toMatchObject({
      nodeCount: 500,
      strategy: 'grouped-table-companion',
      recommendedLayout: 'force',
      grouping: 'required',
      filtering: 'required',
      tableCompanion: 'required',
      visibleNodeBudget: 200
    });
    expect(html).toContain('data-hz-topology-g6-large-graph-owner="hertzbeat-ui-g6-large-graph"');
    expect(html).toContain('data-hz-topology-g6-large-graph-strategy="grouped-table-companion"');
    expect(html).toContain('data-hz-topology-g6-large-graph-grouping="required"');
    expect(html).toContain('data-hz-topology-g6-large-graph-filtering="required"');
    expect(html).toContain('data-hz-topology-g6-large-graph-table-companion="required"');
    expect(html).toContain('data-hz-topology-g6-large-graph-visible-node-budget="200"');
  });

  it('exposes overflow large-graph policy before a 500+ node graph enters G6 rendering', () => {
    const overflowGraph = buildHzTopologyG6ScaleFixture(650);
    const overflowStrategy = buildHzTopologyG6LargeGraphStrategy(overflowGraph);
    const renderWindow = buildHzTopologyG6RenderWindow(overflowGraph, overflowStrategy);
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={overflowGraph} layout="force" height="compact" />);

    expect(overflowStrategy).toMatchObject({
      nodeCount: 650,
      scaleTier: 'overflow',
      strategy: 'filter-first',
      recommendedLayout: 'force',
      grouping: 'required',
      filtering: 'required',
      tableCompanion: 'required',
      visibleNodeBudget: 200
    });
    expect(renderWindow).toMatchObject({
      mode: 'windowed',
      totalNodeCount: 650,
      renderedNodeCount: 200,
      hiddenNodeCount: 450
    });
    expect(html).toContain('data-hz-topology-g6-large-graph-overflow-policy="filter-first-before-expanded-render"');
    expect(html).toContain('data-hz-topology-g6-large-graph-overflow-policy-owner="hertzbeat-ui-g6-large-graph-overflow"');
    expect(html).toContain('data-hz-topology-g6-render-window-total-node-count="650"');
    expect(html).toContain('data-hz-topology-g6-render-window-rendered-node-count="200"');
    expect(html).toContain('data-hz-topology-g6-render-window-hidden-node-count="450"');
    expect(html).toContain('data-hz-topology-g6-summary-count-policy="windowed-rendered-vs-total"');
    expect(html).toContain('data-hz-topology-g6-summary-rendered-node-count="200"');
    expect(html).toContain('data-hz-topology-g6-summary-total-node-count="650"');
    expect(html).toContain('Showing 200/650 nodes');
    expect(html).not.toContain('>650 nodes ·');
  });

  it('windows stress scale graphs before they enter the G6 render data path', () => {
    const stressGraph = buildHzTopologyG6ScaleFixture(500);
    const renderWindow = buildHzTopologyG6RenderWindow(stressGraph);
    const edgeDensityWindow = buildHzTopologyG6EdgeDensityWindow(renderWindow.graph, { mode: renderWindow.mode });
    const semanticClusterSummary = buildHzTopologyG6SemanticClusterSummary(renderWindow.graph, renderWindow);
    const nodeLabelCounts = buildHzTopologyG6NodeLabelCounts(edgeDensityWindow.graph, 'hub-only-large-graph');
    const shapeProfile = buildHzTopologyG6ShapeProfile(renderWindow.graph);
    const edgeReadabilityProfile = buildHzTopologyG6EdgeReadabilityProfile(edgeDensityWindow.graph, edgeDensityWindow.policy);
    const windowedG6Graph = buildHzTopologyG6Graph(edgeDensityWindow.graph, {
      edgeLabelPolicy: 'hidden-large-graph',
      nodeLabelPolicy: 'hub-only-large-graph',
      edgeReadabilityProfile
    });
    const windowedLaneGraph = buildHzTopologyG6WindowedLaneGraph(windowedG6Graph);
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={stressGraph} height="compact" />);
    const source = String(HzTopologyG6Canvas);
    const laneNodePositions = windowedLaneGraph.nodes.map(node => ({
      x: Number(node.style?.x ?? 0),
      y: Number(node.style?.y ?? 0)
    }));
    const laneXValues = new Set(laneNodePositions.map(position => position.x));
    const laneYValues = laneNodePositions.map(position => position.y);
    const laneYSpread = Math.max(...laneYValues) - Math.min(...laneYValues);

    expect(renderWindow).toMatchObject({
      mode: 'windowed',
      totalNodeCount: 500,
      visibleNodeBudget: 200,
      renderedNodeCount: 200,
      hiddenNodeCount: 300
    });
    expect(renderWindow.graph.nodes).toHaveLength(200);
    expect(
      renderWindow.graph.edges.every(
        edge => renderWindow.graph.nodes.some(node => node.id === edge.from) && renderWindow.graph.nodes.some(node => node.id === edge.to)
      )
    ).toBe(true);
    expect(edgeDensityWindow).toMatchObject({
      policy: 'reduced-large-graph',
      totalEdgeCount: renderWindow.graph.edges.length,
      renderedEdgeCount: 180,
      hiddenEdgeCount: renderWindow.graph.edges.length - 180,
      maxVisibleEdgeCount: 180
    });
    expect(semanticClusterSummary).toMatchObject({
      policy: 'hub-fanout-summary',
      hiddenNodeCount: 300,
      itemCount: 4
    });
    expect(semanticClusterSummary.items[0]).toMatchObject({
      rank: 1,
      nodeId: expect.any(String),
      totalEdgeCount: expect.any(Number)
    });
    expect(semanticClusterSummary.items[0]?.totalEdgeCount).toBeGreaterThan(1);
    expect(shapeProfile.shape).toMatch(/mesh|star/);
    expect(shapeProfile.evidence).toBe('degree-derived');
    expect(
      edgeDensityWindow.graph.edges.every(
        edge => edgeDensityWindow.graph.nodes.some(node => node.id === edge.from) && edgeDensityWindow.graph.nodes.some(node => node.id === edge.to)
      )
    ).toBe(true);
    expect(windowedG6Graph.edges.length).toBeGreaterThan(0);
    expect(windowedG6Graph.edges).toHaveLength(180);
    expect(windowedG6Graph.edges.every(edge => edge.style?.labelText === '')).toBe(true);
    expect(edgeReadabilityProfile).toMatchObject({
      policy: 'attenuated-large-graph',
      evidence: 'density-derived',
      rankingPolicy: 'red-priority-stable-render-order',
      maxProminentEdgeCount: 72,
      prominentEdgeCount: 72,
      attenuatedEdgeCount: 108,
      minimumOpacity: 0.2
    });
    expect(windowedG6Graph.edges.filter(edge => edge.style?.opacity === 0.2)).toHaveLength(
      edgeReadabilityProfile.attenuatedEdgeCount
    );
    expect(windowedG6Graph.edges.filter(edge => edge.style?.opacity === 0.92)).toHaveLength(
      edgeReadabilityProfile.prominentEdgeCount
    );
    expect(nodeLabelCounts.hiddenCount).toBeGreaterThan(0);
    expect(nodeLabelCounts.visibleCount).toBeLessThan(edgeDensityWindow.graph.nodes.length);
    expect(windowedG6Graph.nodes.some(node => node.style?.labelText)).toBe(true);
    expect(windowedG6Graph.nodes.filter(node => node.style?.labelText === '')).toHaveLength(nodeLabelCounts.hiddenCount);
    expect(windowedG6Graph.nodes.find(node => node.style?.labelText === '')?.data?.label).toEqual(expect.any(String));
    expect(windowedG6Graph.edges[0].data).toMatchObject({
      relationshipType: 'trace-call',
      source: 'otlp-trace-call'
    });
    expect(windowedLaneGraph.nodes.every(node => typeof node.style?.x === 'number' && typeof node.style?.y === 'number')).toBe(true);
    expect(laneXValues.size).toBeGreaterThan(3);
    expect(laneYSpread).toBeLessThanOrEqual(1258);
    expect(html).toContain('data-hz-topology-g6-render-window-owner="hertzbeat-ui-g6-render-window"');
    expect(html).toContain('data-hz-topology-g6-render-window-mode="windowed"');
    expect(html).toContain('data-hz-topology-g6-render-window-visible-node-budget="200"');
    expect(html).toContain('data-hz-topology-g6-render-window-rendered-node-count="200"');
    expect(html).toContain('data-hz-topology-g6-render-window-rendered-edge-count="180"');
    expect(html).toContain(
      `data-hz-topology-g6-render-window-hidden-edge-count="${renderWindow.totalEdgeCount - edgeDensityWindow.renderedEdgeCount}"`
    );
    expect(html).toContain(
      `data-hz-topology-g6-render-window-candidate-edge-count="${renderWindow.renderedEdgeCount}"`
    );
    expect(html).toContain(
      'data-hz-topology-g6-render-window-rendered-edge-count-owner="hertzbeat-ui-g6-edge-density"'
    );
    expect(html).toContain('data-hz-topology-g6-render-window-hidden-node-count="300"');
    expect(html).toContain('data-hz-topology-g6-render-window-table-companion="required"');
    expect(html).toContain('data-hz-topology-g6-edge-label-owner="hertzbeat-ui-g6-edge-label"');
    expect(html).toContain('data-hz-topology-g6-edge-label-policy="hidden-large-graph"');
    expect(html).toContain('data-hz-topology-g6-edge-label-visible-count="0"');
    expect(html).toContain('data-hz-topology-g6-edge-label-hidden-count=');
    expect(html).toContain('data-hz-topology-g6-node-label-owner="hertzbeat-ui-g6-node-label"');
    expect(html).toContain('data-hz-topology-g6-node-label-policy="hub-only-large-graph"');
    expect(html).toContain('data-hz-topology-g6-node-label-visible-count=');
    expect(html).toContain('data-hz-topology-g6-node-label-hidden-count=');
    expect(html).toContain('data-hz-topology-g6-node-label-metadata-policy="preserve-data-label"');
    expect(html).toContain('data-hz-topology-g6-shape-profile-owner="hertzbeat-ui-g6-shape-profile"');
    expect(html).toContain('data-hz-topology-g6-shape-profile-evidence="degree-derived"');
    expect(html).toContain('data-hz-topology-g6-shape-profile=');
    expect(html).toContain('data-hz-topology-g6-shape-profile-hub-node-count=');
    expect(html).toContain('data-hz-topology-g6-shape-profile-mesh-edge-count=');
    expect(html).toContain('data-hz-topology-g6-shape-profile-star-edge-count=');
    expect(html).toContain('data-hz-topology-g6-edge-density-owner="hertzbeat-ui-g6-edge-density"');
    expect(html).toContain('data-hz-topology-g6-edge-density-policy="reduced-large-graph"');
    expect(html).toContain('data-hz-topology-g6-edge-density-max-visible="180"');
    expect(html).toContain('data-hz-topology-g6-edge-density-rendered-edge-count="180"');
    expect(html).toContain('data-hz-topology-g6-edge-density-hidden-edge-count=');
    expect(html).toContain('data-hz-topology-g6-edge-readability-owner="hertzbeat-ui-g6-edge-readability"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-policy="attenuated-large-graph"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-evidence="density-derived"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-ranking-policy="red-priority-stable-render-order"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-stability="selection-hover-invariant"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-max-prominent-edge-count="72"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-prominent-edge-count="72"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-attenuated-edge-count="108"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-minimum-opacity="0.2"');
    expect(html).toContain('data-hz-topology-g6-edge-density-affordance-owner="hertzbeat-ui-g6-edge-density-affordance"');
    expect(html).toContain('data-hz-topology-g6-edge-density-affordance-visibility="visible"');
    expect(html).toContain('data-hz-topology-g6-edge-density-affordance-action="scroll-edge-table"');
    expect(html).toContain('data-hz-topology-g6-edge-density-affordance-target="topology-metric-table"');
    expect(html).toContain('data-hz-topology-g6-edge-density-affordance-url-policy="preserve-current-url"');
    expect(html).toContain('data-hz-topology-g6-edge-density-affordance-live-owner="hertzbeat-ui-g6-edge-density-affordance"');
    expect(html).toContain('data-hz-topology-g6-edge-density-affordance-invariants="table-scroll no-url-change no-remount no-refit viewport-preserved render-key-stable"');
    expect(html).toContain(
      `data-hz-topology-g6-edge-density-affordance-hidden-edge-count="${stressGraph.edges.length - edgeDensityWindow.renderedEdgeCount}"`
    );
    expect(html).toContain(`data-hz-topology-g6-edge-density-affordance-window-edge-count="${edgeDensityWindow.totalEdgeCount}"`);
    expect(html).toContain(`data-hz-topology-g6-edge-density-affordance-total-edge-count="${stressGraph.edges.length}"`);
    expect(html).toContain(
      `data-hz-topology-g6-edge-density-affordance-total-hidden-edge-count="${stressGraph.edges.length - edgeDensityWindow.renderedEdgeCount}"`
    );
    expect(html).toContain('data-hz-topology-g6-edge-density-affordance-explanation-policy="render-window-not-missing-edges"');
    expect(html).toContain(
      `data-hz-topology-g6-edge-density-affordance-detail-label="${stressGraph.edges.length - edgeDensityWindow.renderedEdgeCount} more in table"`
    );
    expect(html).toContain(`${edgeDensityWindow.renderedEdgeCount}/${stressGraph.edges.length}`);
    expect(html).toContain(`${stressGraph.edges.length - edgeDensityWindow.renderedEdgeCount} more in table`);
    expect(html).not.toContain(`${edgeDensityWindow.renderedEdgeCount}/${edgeDensityWindow.totalEdgeCount}</span>`);
    expect(html).toContain('data-hz-topology-g6-edge-density-affordance-table-companion="required"');
    expect(html).toContain('data-hz-topology-g6-semantic-cluster-owner="hertzbeat-ui-g6-semantic-cluster"');
    expect(html).toContain('data-hz-topology-g6-semantic-cluster-policy="hub-fanout-summary"');
    expect(html).toContain('data-hz-topology-g6-semantic-cluster-item-count="4"');
    expect(html).toContain('data-hz-topology-g6-semantic-cluster-hidden-node-count="300"');
    expect(html).toContain('data-hz-topology-g6-semantic-cluster-table-companion="required"');
    expect(html).toContain('data-hz-topology-g6-semantic-cluster-item-rank="1"');
    expect(html).toContain('data-hz-topology-g6-semantic-cluster-item-role="hub"');
    expect(html).toContain('data-hz-topology-g6-windowed-layout-owner="hertzbeat-ui-g6-windowed-layout"');
    expect(html).toContain('data-hz-topology-g6-windowed-layout-policy="packed-lanes"');
    expect(html).toContain('data-hz-topology-g6-windowed-layout-max-lane-rows="18"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-owner="hertzbeat-ui-g6-mount-lifecycle"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-policy="structure-layout-height-only"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-redraw-policy="setData-draw-preserve-viewport"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-structure-key=');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-structure-key-owner="hertzbeat-ui-g6-structure-key-fingerprint"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-structure-key-policy="short-fingerprint"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-structure-key-length=');
    expect(html).not.toContain('scale-svc-000:service|');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-render-key-owner="hertzbeat-ui-g6-render-key-fingerprint"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-render-key-policy="short-fingerprint"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-render-key-length=');
    expect(html).not.toContain('scale-svc-000::#');
    expect(html).toContain('data-hz-topology-g6-viewport-fit-state="pending"');
    expect(html).toContain('data-hz-topology-g6-stage-initial-paint="hidden-until-fit"');
    expect(html).toContain('data-hz-topology-g6-scale-performance-owner="hertzbeat-ui-g6-scale-performance"');
    expect(html).toContain('data-hz-topology-g6-scale-performance-policy="windowed-interactive-budget"');
    expect(html).toContain(
      'data-hz-topology-g6-scale-performance-invariants="windowed-render pan-zoom-no-url-change no-remount no-refit viewport-preserved render-key-stable table-companion"'
    );
    expect(html).toContain('data-hz-topology-g6-scale-performance-rendered-node-budget="200"');
    expect(html).toContain('data-hz-topology-g6-scale-performance-rendered-edge-budget="180"');
    expect(html).toContain('data-hz-topology-g6-scale-performance-rendered-node-count="200"');
    expect(html).toContain('data-hz-topology-g6-scale-performance-rendered-edge-count="180"');
    expect(source).toContain('buildHzTopologyG6EdgeDensityWindow(renderWindow.graph, { mode: renderWindow.mode })');
    expect(source).toContain('buildHzTopologyG6SemanticClusterSummary(renderWindow.graph, renderWindow)');
    expect(source).toContain('buildHzTopologyG6ShapeProfile(renderWindow.graph)');
    expect(source).toContain('buildHzTopologyG6NodeLabelCounts(edgeDensityWindow.graph, nodeLabelPolicy)');
    expect(source).toContain('buildHzTopologyG6EdgeReadabilityProfile(edgeDensityWindow.graph, edgeDensityWindow.policy, {');
    expect(source).toContain('maxProminentEdgeCount: edgeReadabilityMaxProminentEdgeCount');
    expect(source).toContain('buildHzTopologyG6Graph(edgeDensityWindow.graph, { edgeLabelPolicy, nodeLabelPolicy, edgeReadabilityProfile })');
    expect(source).toContain('handleEdgeDensityDrilldown');
    expect(source).toContain('document.getElementById(edgeDensityDrilldownTargetId)?.scrollIntoView');
    expect(source).toContain('buildHzTopologyG6WindowedLaneGraph(g6Graph)');
    expect(source).toContain('g6LayoutMode === "windowed-lanes"');
    expect(source).not.toContain('buildHzTopologyG6Graph(canvasGraph)');
    expect(source).toContain('"data-hz-topology-g6-mount-lifecycle-policy": "structure-layout-height-only"');
  });

  it('keeps selected, severe, and high-RED edges prominent when large-graph edge readability attenuates context', () => {
    const denseEdgeGraph = {
      nodes: Array.from({ length: 8 }, (_, index) => ({
        id: `readability-node-${index}`,
        label: `Service ${index}`,
        entityType: 'service'
      })),
      edges: Array.from({ length: 8 }, (_, index) => ({
        id: `readability-edge-${index}`,
        from: `readability-node-${index % 4}`,
        to: `readability-node-${4 + (index % 4)}`,
        label: `edge ${index}`,
        relationshipType: 'trace-call',
        source: 'otlp-trace-call',
        tone: index === 7 ? 'danger' : 'neutral',
        selected: index === 7,
        redMetrics:
          index === 7
            ? { requestRatePerSecond: 1200, errorRate: 0.42, latencyP95Ms: 2500 }
            : { requestRatePerSecond: 1, errorRate: 0, latencyP95Ms: 20 }
      }))
    };
    const edgeReadabilityProfile = buildHzTopologyG6EdgeReadabilityProfile(denseEdgeGraph, 'reduced-large-graph', {
      maxProminentEdgeCount: 2
    });
    const g6Graph = buildHzTopologyG6Graph(denseEdgeGraph, {
      edgeReadabilityProfile
    });

    expect(edgeReadabilityProfile).toMatchObject({
      policy: 'attenuated-large-graph',
      rankingPolicy: 'red-priority-stable-render-order',
      maxProminentEdgeCount: 2,
      prominentEdgeCount: 2,
      attenuatedEdgeCount: 6
    });
    expect(edgeReadabilityProfile.prominentEdgeIds).toContain('readability-edge-7');
    expect(edgeReadabilityProfile.attenuatedEdgeIds).not.toContain('readability-edge-7');
    expect(g6Graph.edges.find(edge => edge.id === 'readability-edge-7')?.style?.opacity).toBe(0.92);
    expect(g6Graph.edges.find(edge => edge.id === 'readability-edge-1')?.style?.opacity).toBe(0.2);
  });

  it('attenuates direct dense graph edges before the graph enters render-window mode', () => {
    const denseDirectGraph = {
      nodes: Array.from({ length: 80 }, (_, index) => ({
        id: `direct-node-${index}`,
        label: `Direct Service ${index}`,
        entityType: 'service',
        source: 'otlp-trace-call'
      })),
      edges: Array.from({ length: 130 }, (_, index) => ({
        id: `direct-edge-${index}`,
        from: `direct-node-${index % 40}`,
        to: `direct-node-${40 + (index % 40)}`,
        label: `edge ${index}`,
        relationshipType: 'trace-call',
        source: 'otlp-trace-call',
        tone: index === 120 ? 'danger' : 'neutral',
        selected: index === 120,
        redMetrics:
          index === 120
            ? { requestRatePerSecond: 900, errorRate: 0.12, latencyP95Ms: 1800 }
            : { requestRatePerSecond: 2, errorRate: 0, latencyP95Ms: 30 }
      }))
    };
    const renderWindow = buildHzTopologyG6RenderWindow(denseDirectGraph);
    const edgeDensityWindow = buildHzTopologyG6EdgeDensityWindow(renderWindow.graph, { mode: renderWindow.mode });
    const edgeReadabilityProfile = buildHzTopologyG6EdgeReadabilityProfile(edgeDensityWindow.graph, edgeDensityWindow.policy, {
      maxProminentEdgeCount: 36
    });
    const g6Graph = buildHzTopologyG6Graph(edgeDensityWindow.graph, {
      edgeLabelPolicy: 'hidden-large-graph',
      edgeReadabilityProfile
    });
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={denseDirectGraph} height="compact" />);

    expect(denseDirectGraph.edges.length).toBeGreaterThan(HZ_TOPOLOGY_G6_EDGE_LABEL_VISIBLE_EDGE_LIMIT);
    expect(renderWindow).toMatchObject({
      mode: 'direct',
      renderedNodeCount: 80,
      renderedEdgeCount: 130
    });
    expect(edgeDensityWindow).toMatchObject({
      policy: 'all-visible',
      renderedEdgeCount: 130,
      hiddenEdgeCount: 0
    });
    expect(edgeReadabilityProfile).toMatchObject({
      policy: 'attenuated-large-graph',
      maxProminentEdgeCount: 36,
      prominentEdgeCount: 36,
      attenuatedEdgeCount: 94,
      minimumOpacity: 0.2
    });
    expect(edgeReadabilityProfile.prominentEdgeIds).toContain('direct-edge-120');
    expect(g6Graph.edges.find(edge => edge.id === 'direct-edge-120')?.style?.opacity).toBe(0.92);
    expect(g6Graph.edges.filter(edge => edge.style?.opacity === 0.2)).toHaveLength(94);
    expect(html).toContain('data-hz-topology-g6-render-window-mode="direct"');
    expect(html).toContain('data-hz-topology-g6-edge-density-policy="all-visible"');
    expect(html).toContain('data-hz-topology-g6-edge-density-hidden-edge-count="0"');
    expect(html).toContain('data-hz-topology-g6-edge-label-policy="hidden-large-graph"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-policy="attenuated-large-graph"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-max-prominent-edge-count="36"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-prominent-edge-count="36"');
    expect(html).toContain('data-hz-topology-g6-edge-readability-attenuated-edge-count="94"');
    expect(topologyG6Source).toContain('edgeReadabilityMaxProminentEdgeCount');
    expect(topologyG6Source).toContain('input.edges.length > HZ_TOPOLOGY_G6_EDGE_LABEL_VISIBLE_EDGE_LIMIT');
  });

  it('keeps searched or selected stress-graph nodes inside the render window', () => {
    const stressGraph = buildHzTopologyG6ScaleFixture(500);
    const renderWindow = buildHzTopologyG6RenderWindow(stressGraph, undefined, {
      priorityNodeIds: ['scale-svc-420']
    });
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas graph={stressGraph} searchQuery="Service 420" selectedNodeId="scale-svc-420" height="compact" />
    );
    const source = String(HzTopologyG6Canvas);

    expect(renderWindow).toMatchObject({
      mode: 'windowed',
      renderedNodeCount: 200,
      hiddenNodeCount: 300,
      priorityNodeCount: 1
    });
    expect(renderWindow.graph.nodes).toHaveLength(200);
    expect(renderWindow.graph.nodes.some(node => node.id === 'scale-svc-420')).toBe(true);
    expect(renderWindow.graph.nodes.some(node => node.id === 'scale-svc-199')).toBe(false);
    expect(html).toContain('data-hz-topology-g6-render-window-mode="windowed"');
    expect(html).toContain('data-hz-topology-g6-render-window-priority-node-count="1"');
    expect(html).toContain('data-hz-topology-g6-render-window-priority-node-ids="scale-svc-420"');
    expect(html).toContain('data-hz-topology-g6-search-first-match="scale-svc-420"');
    expect(source).toContain('priorityNodeIds: renderWindowPriorityNodeIds');
    expect(source).not.toContain('buildHzTopologyG6RenderWindow(canvasGraph, largeGraphStrategy)');
  });

  it('keeps ordinary drawer and table selection out of the render-window priority path so clicks do not reorder the canvas', () => {
    const stressGraph = buildHzTopologyG6ScaleFixture(500);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas graph={stressGraph} selectedNodeId="scale-svc-055" selectedEdgeId="scale-edge-421-422" height="compact" />
    );
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-render-window-priority-behavior="search-only-no-selection-reorder"');
    expect(html).toContain('data-hz-topology-g6-render-window-priority-owner="hertzbeat-ui-g6-render-window-priority"');
    expect(html).toContain('data-hz-topology-g6-render-window-priority-node-ids="none"');
    expect(source).toContain('[activeSearchNodeId]');
    expect(source).not.toContain('[activeSearchNodeId, selectedFocusNodeId');
    expect(source).not.toContain('selectedEdgeInput?.from');
    expect(source).not.toContain('selectedEdgeInput?.to');
  });

  it('keeps selected drawer nodes in element state instead of the G6 data redraw path', () => {
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} searchQuery="Checkout" selectedNodeId="db-orders" height="compact" />);
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-selected-node="db-orders"');
    expect(html).toContain('data-hz-topology-g6-search-first-match="svc-checkout"');
    expect(source).toContain('setElementState?.(selectionStatePatch, false)');
    expect(source).toContain('const g6StyleFocusNodeId = activeSearchNodeId;');
    expect(source).toContain('[activeSearchNodeId]');
    expect(source).not.toContain('[activeSearchNodeId, selectedFocusNodeId');
  });

  it('exposes G6 filter scope metadata for source, search, and grouping context', () => {
    const filterScope = buildHzTopologyG6FilterScope(graph, {
      environment: 'prod',
      sourceKind: 'database-middleware-connection',
      groupBy: 'source-kind',
      searchQuery: 'orders'
    });
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={graph}
        filterScope={{
          environment: 'prod',
          sourceKind: 'database-middleware-connection',
          groupBy: 'source-kind',
          searchQuery: 'orders'
        }}
        groupItemHrefs={{
          'database-middleware-connection': '/topology?sourceKind=database-middleware-connection&groupBy=source-kind',
          'otlp-trace-call': '/topology?sourceKind=otlp-trace-call&groupBy=source-kind'
        }}
        height="compact"
      />
    );

    expect(filterScope).toMatchObject({
      environment: 'prod',
      sourceKind: 'database-middleware-connection',
      groupBy: 'source-kind',
      searchQuery: 'orders',
      visibleNodeCount: 2,
      visibleEdgeCount: 1,
      sourceKindMatched: true,
      groupCount: 2
    });
    expect(html).toContain('data-hz-topology-g6-filter-owner="hertzbeat-ui-g6-filter"');
    expect(html).toContain('data-hz-topology-g6-filter-environment="prod"');
    expect(html).toContain('data-hz-topology-g6-filter-source-kind="database-middleware-connection"');
    expect(html).toContain('data-hz-topology-g6-filter-search-query="orders"');
    expect(html).toContain('data-hz-topology-g6-filter-group-by="source-kind"');
    expect(html).toContain('data-hz-topology-g6-filter-visible-node-count="2"');
    expect(html).toContain('data-hz-topology-g6-filter-visible-edge-count="1"');
    expect(html).toContain('data-hz-topology-g6-filter-source-match="true"');
    expect(html).toContain('data-hz-topology-g6-filter-group-count="2"');
    expect(html).toContain('data-hz-topology-g6-filter-node-source-match="true"');
    expect(html).toContain('data-hz-topology-g6-filter-edge-source-match="true"');
  });

  it('renders shared G6 filter controls for source, grouping, search, and reset scope actions', () => {
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={graph}
        filterScope={{
          environment: 'prod',
          sourceKind: 'database-middleware-connection',
          groupBy: 'source-kind',
          searchQuery: 'orders'
        }}
        filterControls={[
          {
            id: 'source-kind',
            kind: 'source-kind',
            label: 'Source',
            value: 'database-middleware-connection',
            href: '/topology?sourceKind=database-middleware-connection',
            active: true
          },
          {
            id: 'group-by',
            kind: 'group-by',
            label: 'Group',
            value: 'source-kind',
            href: '/topology?groupBy=source-kind',
            active: true
          },
          {
            id: 'search',
            kind: 'search',
            label: 'Search',
            value: 'orders',
            href: '/topology?search=orders'
          },
          {
            id: 'reset',
            kind: 'reset',
            label: 'Reset',
            value: 'all',
            href: '/topology'
          }
        ]}
        height="compact"
      />
    );

    expect(html).toContain('data-hz-topology-g6-filter-control-owner="hertzbeat-ui-g6-filter-control"');
    expect(html).toContain('data-hz-topology-g6-filter-control-count="4"');
    expect(html).toContain('data-hz-topology-g6-filter-control-active="source-kind group-by"');
    expect(html).toContain('data-hz-topology-g6-filter-control="source-kind"');
    expect(html).toContain('data-hz-topology-g6-filter-control-kind="source-kind"');
    expect(html).toContain('data-hz-topology-g6-filter-control-value="database-middleware-connection"');
    expect(html).toContain('data-hz-topology-g6-filter-control-active-state="true"');
    expect(html).toContain('data-hz-topology-g6-filter-control-label-owner="hertzbeat-ui-g6-filter-control-label"');
    expect(html).toContain('data-hz-topology-g6-filter-control-value-owner="hertzbeat-ui-g6-filter-control-value"');
    expect(html).toContain('href="/topology?sourceKind=database-middleware-connection"');
    expect(html).toContain('data-hz-topology-g6-filter-control="group-by"');
    expect(html).toContain('data-hz-topology-g6-filter-control-kind="group-by"');
    expect(html).toContain('data-hz-topology-g6-filter-control-value="source-kind"');
    expect(html).toContain('data-hz-topology-g6-filter-control="search"');
    expect(html).toContain('data-hz-topology-g6-filter-control-kind="search"');
    expect(html).toContain('data-hz-topology-g6-filter-control="reset"');
    expect(html).toContain('data-hz-topology-g6-filter-control-kind="reset"');
  });

  it('supports a non-occluding G6 chrome mode for real topology graph surfaces', () => {
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={graph}
        overlayMode="non-occluding"
        filterScope={{ environment: 'prod', sourceKind: 'database-middleware-connection', groupBy: 'source-kind' }}
        filterControls={[
          { id: 'source-kind', kind: 'source-kind', label: 'Source', value: 'database-middleware-connection', active: true, href: '/topology' },
          { id: 'group-by', kind: 'group-by', label: 'Group', value: 'source-kind', active: true, href: '/topology?groupBy=source-kind' }
        ]}
      />
    );

    expect(html).toContain('data-hz-topology-g6-overlay-mode="non-occluding"');
    expect(html).toContain('data-hz-topology-g6-summary-visibility="assistive"');
    expect(html).toContain('data-hz-topology-g6-group-surface-visibility="assistive"');
    expect(html).toContain('data-hz-topology-g6-filter-control-surface-visibility="assistive"');
    expect(html).toContain('data-hz-topology-g6-toolbar-visibility="visible"');
    expect(html).toContain('sr-only');
    expect(html).not.toContain('absolute left-3 top-12 flex');
    expect(html).not.toContain('absolute bottom-3 left-3 flex');
  });

  it('exposes visual G6 group summary metadata for active group-by scope', () => {
    const groupSummary = buildHzTopologyG6GroupSummary(graph, {
      environment: 'prod',
      sourceKind: 'database-middleware-connection',
      groupBy: 'source-kind'
    });
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={graph}
        filterScope={{
          environment: 'prod',
          sourceKind: 'database-middleware-connection',
          groupBy: 'source-kind',
          searchQuery: 'orders'
        }}
        groupItemHrefs={{
          'database-middleware-connection': '/topology?sourceKind=database-middleware-connection&groupBy=source-kind',
          'otlp-trace-call': '/topology?sourceKind=otlp-trace-call&groupBy=source-kind'
        }}
        height="compact"
      />
    );

    expect(groupSummary).toMatchObject({
      groupBy: 'source-kind',
      active: true,
      itemCount: 2,
      totalCollapsedNodeCount: 1
    });
    expect(groupSummary.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'database-middleware-connection',
          nodeCount: 2,
          edgeCount: 1,
          collapsedNodeCount: 1,
          worstTone: 'danger',
          active: true
        }),
        expect.objectContaining({
          id: 'otlp-trace-call',
          nodeCount: 1,
          edgeCount: 0,
          worstTone: 'warning',
          active: false
        })
      ])
    );
    expect(html).toContain('data-hz-topology-g6-group-owner="hertzbeat-ui-g6-group"');
    expect(html).toContain('data-hz-topology-g6-group-by="source-kind"');
    expect(html).toContain('data-hz-topology-g6-group-active="true"');
    expect(html).toContain('data-hz-topology-g6-group-item-count="2"');
    expect(html).toContain('data-hz-topology-g6-group-collapsed-node-count="1"');
    expect(html).toContain('data-hz-topology-g6-group-surface-owner="hertzbeat-ui-g6-group-surface"');
    expect(html).toContain('data-hz-topology-g6-group-item="database-middleware-connection"');
    expect(html).toContain('data-hz-topology-g6-group-item-active="true"');
    expect(html).toContain('data-hz-topology-g6-group-item-worst-tone="danger"');
    expect(html).toContain('data-hz-topology-g6-group-action-count="2"');
    expect(html).toContain('data-hz-topology-g6-group-item-action-owner="hertzbeat-ui-g6-group-item-action"');
    expect(html).toContain('data-hz-topology-g6-group-item-action="filter-group"');
    expect(html).toContain('href="/topology?sourceKind=database-middleware-connection&amp;groupBy=source-kind"');
    expect(html).toContain('data-hz-topology-g6-node-group="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-g6-edge-group="database-middleware-connection"');
  });

  it('counts source-kind group nodes from edge endpoints so source filters never show edge-only 0/1 groups', () => {
    const mixedSourceGraph = {
      nodes: [
        {
          id: 'payment-api',
          label: 'Payment API',
          entityType: 'service',
          health: 'warning',
          tone: 'warning',
          source: 'cmdb-manual-label'
        },
        {
          id: 'checkout-api',
          label: 'Checkout API',
          entityType: 'service',
          health: 'healthy',
          tone: 'success',
          source: 'cmdb-manual-label'
        }
      ],
      edges: [
        {
          id: 'checkout-api--payment-api',
          from: 'checkout-api',
          to: 'payment-api',
          relationshipType: 'trace-call',
          source: 'otlp-trace-call',
          tone: 'warning'
        }
      ]
    };
    const groupSummary = buildHzTopologyG6GroupSummary(mixedSourceGraph, {
      environment: 'prod',
      sourceKind: 'otlp-trace-call',
      groupBy: 'source-kind'
    });
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={mixedSourceGraph}
        filterScope={{ environment: 'prod', sourceKind: 'otlp-trace-call', groupBy: 'source-kind' }}
        height="compact"
      />
    );

    expect(groupSummary.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'otlp-trace-call',
          nodeCount: 2,
          edgeCount: 1,
          collapsedNodeCount: 1,
          active: true
        })
      ])
    );
    expect(html).toContain('data-hz-topology-g6-group-item="otlp-trace-call"');
    expect(html).toContain('data-hz-topology-g6-group-item-node-count="2"');
    expect(html).toContain('data-hz-topology-g6-group-item-edge-count="1"');
    expect(html).not.toContain('data-hz-topology-g6-group-item-node-count="0"');
  });

  it('renders an in-canvas legend dock so topology pages do not need a right companion rail for legend context', () => {
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={graph}
        height="compact"
        legendSlot={
          <div data-testid="legend-dock-content">
            <span>health</span>
            <span>source kind</span>
          </div>
        }
      />
    );

    expect(html).toContain('data-hz-topology-g6-legend-dock="in-canvas"');
    expect(html.match(/data-hz-topology-g6-legend-dock="in-canvas"/g)).toHaveLength(1);
    expect(html).toContain('data-hz-topology-g6-legend-dock-state="in-canvas"');
    expect(html).toContain('data-hz-topology-g6-legend-dock-container="true"');
    expect(html).toContain('data-hz-topology-g6-legend-dock-selector="container-only"');
    expect(html).toContain('data-hz-topology-g6-legend-dock-owner="hertzbeat-ui-g6-legend-dock"');
    expect(html).toContain('data-hz-topology-g6-legend-dock-placement="canvas-bottom-left"');
    expect(html).toContain('data-hz-topology-g6-legend-dock-occlusion="inside-canvas-low-interruption"');
    expect(html).toContain('data-hz-topology-g6-legend-dock-border="none"');
    expect(html).toContain('data-testid="legend-dock-content"');
  });

  it('focuses graph search matches before selected drawer scope', () => {
    const scaleGraph = buildHzTopologyG6ScaleFixture(50);
    const searchFocus = buildHzTopologyG6SearchFocus(scaleGraph, 'Service 017');
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={scaleGraph}
        selectedNodeId="scale-svc-000"
        searchQuery="Service 017"
        height="compact"
      />
    );

    expect(searchFocus).toMatchObject({
      query: 'Service 017',
      status: 'matched',
      matchCount: 1,
      firstMatchedNodeId: 'scale-svc-017',
      matchedNodeIds: ['scale-svc-017']
    });
    expect(html).toContain('data-hz-topology-g6-search-owner="hertzbeat-ui-g6-search"');
    expect(html).toContain('data-hz-topology-g6-search-query="Service 017"');
    expect(html).toContain('data-hz-topology-g6-search-status="matched"');
    expect(html).toContain('data-hz-topology-g6-search-match-count="1"');
    expect(html).toContain('data-hz-topology-g6-search-first-match="scale-svc-017"');
    expect(html).toContain('data-hz-topology-g6-search-focus-clear="hover"');
    expect(html).toContain('data-hz-topology-g6-active-focus-source="search-node"');
    expect(html).toContain('data-hz-topology-g6-focused-node="scale-svc-017"');
    expect(html).toContain('data-hz-topology-g6-toolbar-focus-actions-visibility="assistive"');
    expect(html).toContain('data-hz-topology-g6-action="focus-search-result"');
    expect(html).toContain('data-hz-topology-g6-search-match="true"');
  });

  it('shows a compact no-match status when graph search keeps the current topology', () => {
    const scaleGraph = buildHzTopologyG6ScaleFixture(50);
    const searchFocus = buildHzTopologyG6SearchFocus(scaleGraph, 'missing-service');
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={scaleGraph}
        searchQuery="missing-service"
        searchEmptyLabel='No topology nodes matched "missing-service". The current graph is retained.'
        height="compact"
      />
    );

    expect(searchFocus).toMatchObject({
      query: 'missing-service',
      status: 'empty',
      matchCount: 0,
      firstMatchedNodeId: undefined,
      matchedNodeIds: []
    });
    expect(html).toContain('data-hz-topology-g6-search-status="empty"');
    expect(html).toContain('data-hz-topology-g6-search-empty="visible"');
    expect(html).toContain('data-hz-topology-g6-search-empty-owner="hertzbeat-ui-g6-search-empty"');
    expect(html).toContain('data-hz-topology-g6-search-empty-query="missing-service"');
    expect(html).toContain('data-hz-topology-g6-search-empty-behavior="retain-graph-explain-no-match"');
    expect(html).toContain('No topology nodes matched &quot;missing-service&quot;. The current graph is retained.');
    expect(html).toContain('data-hz-topology-g6-action-state="disabled"');
  });

  it('exposes a selected-node refocus action for retained drawer context', () => {
    const scaleGraph = buildHzTopologyG6ScaleFixture(50);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas graph={scaleGraph} selectedNodeId="scale-svc-000" height="compact" />
    );
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-selected-focus-owner="hertzbeat-ui-g6-selected-focus"');
    expect(html).toContain('data-hz-topology-g6-selected-focus-target="scale-svc-000"');
    expect(html).toContain('data-hz-topology-g6-selected-focus-status="ready"');
    expect(html).toContain('data-hz-topology-g6-selected-focus-behavior="focus-selected-node"');
    expect(html).toContain('data-hz-topology-g6-selected-focus-clear="hover"');
    expect(html).toContain('data-hz-topology-g6-focus-action-owner="hertzbeat-ui-g6-focus-action"');
    expect(html).toContain('data-hz-topology-g6-focus-action-behavior="explicit-toolbar-recenter"');
    expect(html).toContain('data-hz-topology-g6-focus-action-source="none"');
    expect(html).toContain('data-hz-topology-g6-focus-action-target="none"');
    expect(html).toContain('data-hz-topology-g6-toolbar-focus-actions-visibility="assistive"');
    expect(html).toContain('data-hz-topology-g6-action="focus-selected-node"');
    expect(source).toContain('focusGraphElement');
    expect(source).toContain('setFocusActionTelemetry');
    expect(source).toContain('publishViewportTelemetry("focus-element")');
    expect(source).toContain('focusGraphElement("selected-node"');
    expect(source).toContain('focusGraphElement("search-result"');
    expect(source).toContain('clearSharedHover();');
  });

  it('exposes shared G6 toolbar action owner, state, and behavior metadata', () => {
    const scaleGraph = buildHzTopologyG6ScaleFixture(50);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={scaleGraph}
        selectedNodeId="scale-svc-000"
        searchQuery="Service 017"
        height="compact"
      />
    );

    expect(html).toContain('data-hz-topology-g6-toolbar-owner="hertzbeat-ui-g6-toolbar"');
    expect(html).toContain('data-hz-topology-g6-toolbar-action-count="4"');
    expect(html).toContain('data-hz-topology-g6-toolbar-visible-actions="zoom-out zoom-in fit-view reset-view"');
    expect(html).toContain('data-hz-topology-g6-toolbar-focus-actions-visibility="assistive"');
    expect(html).toContain('data-hz-topology-g6-action-owner="hertzbeat-ui-g6-action"');
    expect(html).toContain('data-hz-topology-g6-action="zoom-out"');
    expect(html).toContain('data-hz-topology-g6-action-state="ready"');
    expect(html).toContain('data-hz-topology-g6-action-behavior="zoom-scale"');
    expect(html).toContain('data-hz-topology-g6-action="zoom-in"');
    expect(html).toContain('data-hz-topology-g6-action="fit-view"');
    expect(html).toContain('data-hz-topology-g6-action-behavior="overflow-fit-and-center"');
    expect(html).toContain('data-hz-topology-g6-action="reset-view"');
    expect(html).toContain('data-hz-topology-g6-action-behavior="zoom-one-overflow-fit-center"');
    expect(html).toContain('data-hz-topology-g6-action="focus-selected-node"');
    expect(html).toContain('data-hz-topology-g6-action-target="scale-svc-000"');
    expect(html).toContain('data-hz-topology-g6-action="focus-search-result"');
    expect(html).toContain('data-hz-topology-g6-action-target="scale-svc-017"');
  });

  it('hides viewport controls for empty G6 graphs because there is no graph to zoom or fit', () => {
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={{ nodes: [], edges: [] }}
        height="compact"
        filterScope={{ environment: 'prod', sourceKind: 'otlp-trace-call', groupBy: 'source-kind', searchQuery: 'Payment API' }}
        filterControls={[
          { id: 'source-kind', kind: 'source-kind', label: 'Source', value: 'otlp-trace-call', href: '/topology?sourceKind=otlp-trace-call', active: true },
          { id: 'group-by', kind: 'group-by', label: 'Group', value: 'source-kind', href: '/topology?groupBy=source-kind', active: true },
          { id: 'search', kind: 'search', label: 'Focus', value: 'Payment API', href: '/topology?entityName=Payment%20API' },
          { id: 'reset', kind: 'reset', label: 'Reset', value: 'all', href: '/topology' }
        ]}
      />
    );

    expect(html).toContain('data-hz-topology-g6-node-count="0"');
    expect(html).toContain('data-hz-topology-g6-edge-count="0"');
    expect(html).toContain('data-hz-topology-g6-toolbar-visibility="hidden-empty-graph"');
    expect(html).toContain('data-hz-topology-g6-minimap-visibility="hidden-empty-graph"');
    expect(html).toContain('data-hz-topology-g6-summary-visibility="hidden-empty-graph"');
    expect(html).toContain('data-hz-topology-g6-group-surface-visibility="hidden-empty-graph"');
    expect(html).toContain('data-hz-topology-g6-filter-control-surface-visibility="hidden-empty-graph"');
    expect(html).not.toContain('data-hz-topology-g6-toolbar-visible-actions="zoom-out zoom-in fit-view reset-view"');
    expect(html).not.toContain('data-hz-topology-g6-action="zoom-out"');
    expect(html).not.toContain('data-hz-topology-g6-action="fit-view"');
    expect(html).not.toContain('data-hz-topology-g6-minimap="viewport-overview"');
    expect(html).not.toContain('data-hz-topology-g6-summary-owner="hertzbeat-ui-g6-summary"');
    expect(html).not.toContain('data-hz-topology-g6-group-surface-owner="hertzbeat-ui-g6-group-surface"');
    expect(html).not.toContain('data-hz-topology-g6-filter-control-surface-owner="hertzbeat-ui-g6-filter-control-surface"');
    expect(html).not.toContain('data-hz-topology-g6-filter-control="source-kind"');
  });

  it('uses a node-only layout for CMDB graphs that have entities but no dependency edges', () => {
    const source = topologyG6Source;
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={{
          nodes: [
            { id: 'payment-api', label: 'Payment API', entityType: 'service', source: 'cmdb-manual-label' },
            { id: 'checkout-api', label: 'Checkout API', entityType: 'service', source: 'cmdb-manual-label' },
            { id: 'orders-db', label: 'Orders DB', entityType: 'database', source: 'cmdb-manual-label' }
          ],
          edges: []
        }}
        height="compact"
      />
    );

    expect(html).toContain('data-hz-topology-g6-node-count="3"');
    expect(html).toContain('data-hz-topology-g6-edge-count="0"');
    expect(html).toContain('data-hz-topology-g6-toolbar-visibility="visible"');
    expect(html).toContain('data-hz-topology-g6-node-only-layout="grid"');
    expect(html).toContain('data-hz-topology-g6-layout-mode="node-only-grid"');
    expect(html).toContain('data-hz-topology-g6-relation-state="entities-without-relation-edges"');
    expect(html).toContain('data-hz-topology-g6-relation-state-owner="hertzbeat-ui-g6-relation-state"');
    expect(html).toContain('data-hz-topology-g6-node-only-explanation="visible"');
    expect(html).toContain('data-hz-topology-g6-node-only-explanation-owner="hertzbeat-ui-g6-node-only-explanation"');
    expect(html).toContain('data-hz-topology-g6-node-only-explanation-reason="current-filter-has-nodes-no-edges"');
    expect(html).toContain('Entities only · no relation edges');
    expect(source).toContain('nodeOnlyExplanationLabel?: string;');
    expect(source).toContain("nodeOnlyExplanationLabel = 'Entities only · no relation edges'");
    expect(source).toContain('{nodeOnlyExplanationLabel}');
    const localizedHtml = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={{
          nodes: [{ id: 'payment-api', label: 'Payment API', entityType: 'service', source: 'cmdb-manual-label' }],
          edges: []
        }}
        height="compact"
        nodeOnlyExplanationLabel={nodeOnlyLocalizedExplanation}
      />
    );
    expect(localizedHtml).toContain(nodeOnlyLocalizedExplanation);
    expect(localizedHtml).not.toContain('Entities only · no relation edges');
    expect(buildHzTopologyG6NodeOnlyGridGraph(buildHzTopologyG6Graph({
      nodes: [
        { id: 'payment-api', label: 'Payment API', entityType: 'service', source: 'cmdb-manual-label' },
        { id: 'checkout-api', label: 'Checkout API', entityType: 'service', source: 'cmdb-manual-label' },
        { id: 'orders-db', label: 'Orders DB', entityType: 'database', source: 'cmdb-manual-label' }
      ],
      edges: []
    })).nodes.map(node => [node.style?.x, node.style?.y])).toEqual([[-72, 0], [72, 0], [-72, 126]]);
    expect(source).toContain(
      "const g6LayoutMode = edgeCount === 0 && nodeCount > 0 ? 'node-only-grid' : shouldUseWindowedLaneLayout ? 'windowed-lanes' : layout;"
    );
    expect(source).toContain("g6LayoutMode === 'node-only-grid'");
    expect(source).toContain('buildHzTopologyG6NodeOnlyGridGraph(g6Graph)');
    expect(source).toContain("g6LayoutMode === 'node-only-grid'\n              ? undefined");
    expect(source).not.toContain("layout === 'force' ? { type: 'force'");
  });

  it('does not keep node-only CMDB graphs hidden behind the compact fit pass', () => {
    const source = topologyG6Source;
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={{
          nodes: [
            { id: 'payment-api', label: 'Payment API', entityType: 'service', source: 'cmdb-manual-label' },
            { id: 'checkout-api', label: 'Checkout API', entityType: 'service', source: 'cmdb-manual-label' },
            { id: 'orders-db', label: 'Orders DB', entityType: 'database', source: 'cmdb-manual-label' }
          ],
          edges: []
        }}
        height="compact"
      />
    );

    expect(html).toContain('data-hz-topology-g6-node-only-first-paint="render-before-center"');
    expect(html).toContain('data-hz-topology-g6-node-only-first-paint-owner="hertzbeat-ui-g6-node-only-first-paint"');
    expect(html).toContain('data-hz-topology-g6-node-only-prepaint="source-backed-node-overlay"');
    expect(html).toContain('data-hz-topology-g6-node-only-prepaint-owner="hertzbeat-ui-g6-node-only-prepaint"');
    expect(html).toContain('data-hz-topology-g6-node-only-prepaint-visibility="visible-until-g6-ready"');
    expect(html).toContain('data-hz-topology-g6-node-only-prepaint-node-count="3"');
    expect(html).toContain('data-hz-topology-g6-node-only-prepaint-node-label="Payment API"');
    expect(html).toContain('data-hz-topology-g6-node-only-prepaint-node-icon-source="lucide-react:entity-type-catalog"');
    expect(html).toContain('data-hz-topology-g6-node-only-prepaint-node-icon-no-handdrawn="true"');
    expect(source).toContain("const shouldFastPaintNodeOnlyGraph = g6LayoutMode === 'node-only-grid';");
    expect(source).toContain("if (shouldFastPaintNodeOnlyGraph && !disposed) {");
    expect(source).toContain("setRenderState('ready');");
    expect(source).toContain('window.requestAnimationFrame(() => {');
    expect(source.indexOf("setRenderState('ready');")).toBeLessThan(
      source.indexOf('await runtimeGraph.render();')
    );
    expect(source.indexOf('await runtimeGraph.render();')).toBeLessThan(
      source.indexOf('centerOnlyG6Viewport(runtimeGraph, false)')
    );
  });

  it('preserves the G6 viewport around structural graph data redraws', () => {
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} selectedEdgeId="svc-checkout--db-orders" />);
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-viewport-redraw-preservation="zoom-position"');
    expect(html).toContain('data-hz-topology-g6-viewport-redraw-preservation-owner="hertzbeat-ui-g6-viewport-redraw-preservation"');
    expect(source).toContain('captureG6ViewportSnapshot');
    expect(source).toContain('restoreG6ViewportSnapshot');
    expect(source).toContain('captureG6ViewportSnapshot(runtimeGraph)');
    expect(source).toContain('restoreG6ViewportSnapshot(runtimeGraph, snapshot, runtimeMaxZoom)');
    expect(source).toContain('shouldPreserveViewportAfterRedraw');
    expect(source).toContain('publishViewportTelemetry(clamped ? "runtime-zoom-guard" : "initial-fit")');
  });

  it('keeps drawer selection out of the G6 data redraw path', () => {
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas graph={graph} selectedNodeId="svc-checkout" selectedEdgeId="svc-checkout--db-orders" />
    );
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-selection-redraw-behavior="element-state-no-data-redraw"');
    expect(html).toContain('data-hz-topology-g6-selection-state-owner="hertzbeat-ui-g6-selection-state"');
    expect(source).toContain('selectedElementStateRef');
    expect(source).toContain('setElementState?.(selectionStatePatch, false)');
    expect(source).toContain('const g6StyleFocusNodeId = activeSearchNodeId;');
    expect(source).toContain('const g6StyleFocusEdgeId = void 0;');
    expect(source).not.toContain('const g6StyleFocusNodeId = activeSearchNodeId ?? selectedFocusNodeId;');
    expect(source).not.toContain('const g6StyleFocusEdgeId = activeSearchNodeId ? void 0 : selectedEdgeId;');
    expect(source).not.toContain('[activeSearchNodeId, selectedFocusNodeId');
    expect(source).not.toContain('searchFocus.firstMatchedNodeId !== selectedNodeId');
  });

  it('guards G6 selection state updates to rendered window elements only', () => {
    const scaleGraph = buildHzTopologyG6ScaleFixture(501);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={scaleGraph}
        selectedNodeId="scale-svc-500"
        selectedEdgeId="scale-edge-499-500"
      />
    );
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-render-window-mode="windowed"');
    expect(html).toContain('data-hz-topology-g6-selection-state-policy="rendered-elements-only"');
    expect(html).toContain('data-hz-topology-g6-selected-node-rendered="false"');
    expect(html).toContain('data-hz-topology-g6-selected-edge-rendered="false"');
    expect(html).toContain('data-hz-topology-g6-selection-state-selected-node-rendered="false"');
    expect(html).toContain('data-hz-topology-g6-selection-state-selected-edge-rendered="false"');
    expect(html).toContain('data-hz-topology-g6-selection-state-skipped-target-count="2"');
    expect(source).toContain('renderedG6ElementIds.nodeIds.has(selectedFocusNodeId)');
    expect(source).toContain('renderedG6ElementIds.edgeIds.has(selectedEdgeId)');
    expect(source).toContain('const nextState = renderedSelectionState');
  });

  it('keeps node hover as highlight-only so it cannot recenter an operator-zoomed G6 viewport', () => {
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} hoveredNodeId="db-orders" selectedNodeId="svc-checkout" />);
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-hover-viewport-behavior="highlight-only"');
    expect(html).toContain('data-hz-topology-g6-hover-viewport-owner="hertzbeat-ui-g6-hover-viewport"');
    expect(html).toContain('data-hz-topology-g6-selection-auto-focus="explicit-action-only"');
    expect(html).toContain('data-hz-topology-g6-selection-auto-focus-owner="hertzbeat-ui-g6-selection-auto-focus"');
    expect(html).toContain('data-hz-topology-g6-search-viewport-behavior="highlight-only"');
    expect(source).toContain('const shouldAutoFocusSearchResult = false;');
    expect(source).not.toContain('if (shouldAutoFocusSearchResult && activeFocusNodeId) runtimeGraph.focusElement?.(activeFocusNodeId, { duration: 180 });');
    expect(source).not.toContain('const shouldFocusViewportElement = activeFocusSource === "search-node" || activeFocusSource === "selection";');
    expect(source).not.toContain('if (activeFocusNodeId) runtimeGraph.focusElement?.(activeFocusNodeId, { duration: 180 });');
  });

  it('keeps search result matching as highlight-only until the operator explicitly focuses it', () => {
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas graph={graph} searchQuery="Checkout" hoveredNodeId="db-orders" selectedNodeId="svc-checkout" />
    );
    const source = topologyG6Source;

    expect(html).toContain('data-hz-topology-g6-search-auto-focus="explicit-action-only"');
    expect(html).toContain('data-hz-topology-g6-search-auto-focus-owner="hertzbeat-ui-g6-search-auto-focus"');
    expect(html).toContain('data-hz-topology-g6-search-auto-focus-guard="operator-viewport-interaction"');
    expect(html).toContain('data-hz-topology-g6-search-viewport-behavior="highlight-only"');
    expect(source).toContain('const shouldAutoFocusSearchResult = false;');
    expect(source).not.toContain('if (shouldAutoFocusSearchResult && activeFocusNodeId) runtimeGraph.focusElement?.(activeFocusNodeId, { duration: 180 });');
    expect(source).toContain("focusGraphElement('search-result', searchFocus.firstMatchedNodeId);");
    expect(source).not.toContain('[activeFocusNodeId, renderState, shouldFocusViewportElement]');
  });

  it('keeps live hover out of the G6 data redraw path so real mouse hover cannot reset zoom', () => {
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas graph={graph} selectedNodeId="svc-checkout" hoveredNodeId="db-orders" />
    );
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-hover-redraw-behavior="metadata-only"');
    expect(html).toContain('data-hz-topology-g6-hover-redraw-owner="hertzbeat-ui-g6-hover-redraw"');
    expect(source).toContain('const g6StyleFocusNodeId = activeSearchNodeId;');
    expect(source).toContain('const g6StyleFocusEdgeId = void 0;');
    expect(source).toContain('const g6NeighborFocus =');
    expect(source).toContain('useMemo(');
    expect(source).toContain('buildHzTopologyG6RenderWindow(canvasGraph');
    expect(source).toContain('buildHzTopologyG6EdgeDensityWindow(renderWindow.graph, { mode: renderWindow.mode })');
    expect(source).toContain('buildHzTopologyG6Graph(edgeDensityWindow.graph, { edgeLabelPolicy, nodeLabelPolicy, edgeReadabilityProfile })');
    expect(source).not.toContain('buildHzTopologyG6Graph(canvasGraph)');
    expect(source).not.toContain('activeHoveredNodeId ?? (activeHoveredEdgeId ? void 0 : activeSearchNodeId ?? selectedNodeId)');
  });

  it('does not use G6 hover-activate state mutation because node hover must not move a zoomed viewport', () => {
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} hoveredNodeId="db-orders" />);
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-neighbor-highlight="metadata-only"');
    expect(html).toContain('data-hz-topology-g6-hover-state-engine="metadata-only-no-g6-state"');
    expect(source).not.toContain("{ type: 'hover-activate', key: 'hover-activate' }");
  });

  it('keeps live hover callbacks out of the G6 mount lifecycle so node borders cannot remount and refit the graph', () => {
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} selectedNodeId="svc-checkout" />);
    const source = String(HzTopologyG6Canvas);

    expect(html).not.toContain('data-hz-topology-g6-passive-pointer-viewport-guard');
    expect(source).toContain('onNodeHoverRef =');
    expect(source).toContain('useRef(onNodeHover)');
    expect(source).toContain('onEdgeHoverRef =');
    expect(source).toContain('useRef(onEdgeHover)');
    expect(source).toContain('onHoverClearRef =');
    expect(source).toContain('useRef(onHoverClear)');
    expect(source).toContain('onNodeHoverRef.current?.(String(id), readG6EventAnchor(event, stage));');
    expect(source).toContain('onEdgeHoverRef.current?.(String(id), readG6EventAnchor(event, stage));');
    expect(source).toContain('onHoverClearRef.current?.();');
    expect(source).not.toContain('restoreOperatorViewportAfterPassivePointer');
    expect(source).not.toContain('stage.addEventListener("pointermove", handleG6PassivePointerViewportGuard)');
    expect(source).not.toContain('onEdgeHover, onHoverClear, onNodeHover, publishViewportTelemetry');
  });

  it('exposes live viewport telemetry for browser zoom and pan verification', () => {
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} selectedNodeId="svc-checkout" />);
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-viewport-telemetry="live"');
    expect(html).toContain('data-hz-topology-g6-viewport-telemetry-owner="hertzbeat-ui-g6-viewport-telemetry"');
    expect(html).toContain('data-hz-topology-g6-viewport-telemetry-timing="after-action-settled"');
    expect(html).toContain('data-hz-topology-g6-viewport-telemetry-timing-owner="hertzbeat-ui-g6-viewport-telemetry-timing"');
    expect(html).toContain('data-hz-topology-g6-command-bridge="custom-event"');
    expect(html).toContain('data-hz-topology-g6-command-bridge-owner="hertzbeat-ui-g6-command-bridge"');
    expect(html).toContain('data-hz-topology-g6-command-event="hz-topology-g6-viewport-command"');
    expect(html).toContain('data-hz-topology-g6-command-request="idle"');
    expect(html).toContain('data-hz-topology-g6-command-request-owner="hertzbeat-ui-g6-command-request"');
    expect(html).toContain('data-hz-topology-g6-command-actions="zoom-in zoom-out fit-view reset-view"');
    expect(html).toContain('data-hz-topology-g6-wheel-mode="manual-clamped-g6-zoom"');
    expect(html).toContain('data-hz-topology-g6-wheel-owner="hertzbeat-ui-g6-wheel"');
    expect(html).toContain('data-hz-topology-g6-wheel-listener-passive="false-control"');
    expect(html).toContain('data-hz-topology-g6-wheel-origin="pointer-clamped"');
    expect(html).toContain(`data-hz-topology-g6-wheel-zoom-bounds="0.18-${HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM}"`);
    expect(html).toContain('data-hz-topology-g6-keyboard-shortcuts="plus-minus-zero-fit"');
    expect(html).toContain('data-hz-topology-g6-keyboard-shortcuts-owner="hertzbeat-ui-g6-keyboard"');
    expect(html).toContain('data-hz-topology-g6-keyboard-actions="zoom-in zoom-out reset-view fit-view"');
    expect(html).toContain('data-hz-topology-g6-initial-fit-cancel="operator-viewport-interaction"');
    expect(html).toContain('data-hz-topology-g6-initial-fit-cancel-owner="hertzbeat-ui-g6-initial-fit-cancel"');
    expect(html).toContain('data-hz-topology-g6-viewport-telemetry-source="initial"');
    expect(html).toContain('data-hz-topology-g6-viewport-telemetry-zoom="unknown"');
    expect(html).toContain('data-hz-topology-g6-viewport-telemetry-position="unknown"');
    expect(html).toContain('data-hz-topology-g6-viewport-alias-owner="hertzbeat-ui-g6-viewport-telemetry-alias"');
    expect(html).toContain('data-hz-topology-g6-viewport-zoom="unknown"');
    expect(html).toContain('data-hz-topology-g6-viewport-position="unknown"');
    expect(source).toContain('publishViewportTelemetry');
    expect(source).toContain('publishViewportTelemetryAfterViewportAction');
    expect(source).toContain('Promise.resolve(action()).then');
    expect(source).toContain('publishViewportTelemetryAfterViewportAction("zoom-control"');
    expect(source).toContain('const currentZoom = graphRef.current?.getZoom?.() ?? 1');
    expect(source).toContain('const nextZoom = Math.max(HZ_TOPOLOGY_G6_MIN_ZOOM, Math.min(operatorMaxZoom, currentZoom * scale))');
    expect(source).toContain('centerG6ViewportOrigin(stageRef.current)');
    expect(source).toContain('handleG6WheelViewportControl');
    expect(source).toContain('readG6WheelViewportOrigin(event, stage)');
    expect(source).toContain('const wheelScale = Math.exp(-clampedDelta / 650);');
    expect(source).not.toContain('type: "zoom-canvas", key: "zoom-canvas"');
    expect(source).toContain('graphRef.current?.zoomTo?.(nextZoom, { duration: 120 }, origin)');
    expect(source).toContain('publishViewportTelemetryAfterViewportAction("fit-view"');
    expect(source).toContain('publishViewportTelemetryAfterViewportAction("reset-view"');
    expect(source).toContain('handleViewportCommandEvent');
    expect(source).toContain('handleViewportCommandRequest');
    expect(source).toContain('handleG6ViewportKeyboardShortcut');
    expect(source).toContain('isEditableG6ShortcutTarget');
    expect(source).toContain('event.key === "+" || event.key === "="');
    expect(source).toContain('event.key === "-" || event.key === "_"');
    expect(source).toContain('event.key === "0"');
    expect(source).toContain('event.key.toLocaleLowerCase() === "f"');
    expect(source).toContain('window.addEventListener("keydown", handleG6ViewportKeyboardShortcut)');
    expect(source).toContain('stage.addEventListener("wheel", handleG6WheelViewportControl, { passive: false })');
    expect(source).not.toContain('handleNativeWheelZoomFinish');
    expect(source).not.toContain('root.addEventListener("wheel", handleG6CanvasWheel');
    expect(source).toContain('hz-topology-g6-viewport-command');
    expect(source).toContain('root.addEventListener');
    expect(source).toContain('new MutationObserver');
    expect(source).toContain('data-hz-topology-g6-command-request');
    expect(source).toContain('commandAction === "zoom-in"');
    expect(source).toContain('commandAction === "zoom-out"');
    expect(source).toContain('commandAction === "fit-view"');
    expect(source).toContain('commandAction === "reset-view"');
    expect(source).toContain('cancelPendingInitialFitView');
    expect(source).toContain('initialFitTimerRef.current');
    expect(source).toContain('cancelPendingInitialFitView();');
    expect(source).toContain('if (source === "initial-fit" && hasUserViewportInteractedRef.current) return;');
    expect(source).toContain('scheduleInitialFitView(runtimeGraph, initialFitStrategy, () => !hasUserViewportInteractedRef.current)');
    expect(source).toContain('publishViewportTelemetryAfterViewportAction("wheel"');
    expect(source).toContain('publishViewportTelemetry("pointer-pan")');
    expect(source).toContain('publishViewportTelemetry(clamped ? "runtime-zoom-guard" : "redraw-restore")');
  });

  it('renders a shared non-occluding viewport overview for scale and zoom orientation', () => {
    const scaleGraph = buildHzTopologyG6ScaleFixture(50);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas graph={scaleGraph} selectedNodeId="scale-svc-000" overlayMode="non-occluding" />
    );
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-minimap="viewport-overview"');
    expect(html).toContain('data-hz-topology-g6-minimap-owner="hertzbeat-ui-g6-minimap"');
    expect(html).toContain('data-hz-topology-g6-minimap-visibility="assistive"');
    expect(html).toContain('data-hz-topology-g6-minimap-occlusion="none"');
    expect(html).toContain('data-hz-topology-g6-minimap-node-count="50"');
    expect(html).toContain('data-hz-topology-g6-minimap-edge-count="62"');
    expect(html).toContain('data-hz-topology-g6-minimap-scale-tier="compact"');
    expect(html).toContain('data-hz-topology-g6-minimap-viewport-source="initial"');
    expect(html).toContain('data-hz-topology-g6-minimap-viewport-zoom="unknown"');
    expect(html).toContain('data-hz-topology-g6-minimap-viewport-position="unknown"');
    expect(source).toContain('data-hz-topology-g6-minimap-owner');
    expect(source).toContain('formatG6ViewportZoom(viewportTelemetry.zoom)');
    expect(source).toContain('formatG6ViewportPosition(viewportTelemetry.position)');
  });

  it('renders an SSR-safe shared G6 shell with browser-verifiable graph identity', () => {
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas
        graph={graph}
        selectedEdgeId="svc-checkout--db-orders"
        selectedNodeId="svc-checkout"
        layout="layered-service"
        height="compact"
      />
    );

    expect(html).toContain('data-hz-ui="topology-g6-canvas"');
    expect(html).toContain('data-hz-topology-g6-canvas-owner="hertzbeat-ui-g6-canvas"');
    expect(html).toContain('data-hz-topology-g6-visual-language="hertzbeat-dark-hard-canvas"');
    expect(html).toContain('data-hz-topology-g6-canvas-background="neutral-graphite"');
    expect(html).toContain('data-hz-topology-g6-canvas-radius="hard-2px"');
    expect(html).toContain('data-hz-topology-g6-node-visual="circle-icon-label"');
    expect(html).toContain('data-hz-topology-g6-node-icon-source="lucide-entity-type-catalog"');
    expect(html).toContain('data-hz-topology-g6-node-icon-library="lucide-react"');
    expect(html).toContain('data-hz-topology-g6-node-icon-no-handdrawn="true"');
    expect(html).toContain('data-hz-topology-g6-no-handdrawn-icons="true"');
    expect(html).toContain('data-hz-topology-g6-icon-source-proof="lucide-react:entity-type-catalog"');
    expect(html).toContain('data-hz-topology-g6-node-icon-catalog-owner="lucide-react-entity-type-catalog"');
    expect(html).toContain('data-hz-topology-g6-node-icon-catalog="application:app-window service:server-cog endpoint:route database:database cache:memory-stick queue:inbox middleware:workflow k8s-workload:container monitor:activity resource:server alert:triangle-alert unknown:circle-help"');
    expect(html).toContain('data-hz-topology-node-icon-library="lucide-react"');
    expect(html).toContain('data-hz-topology-node-icon-source="entity-type-catalog"');
    expect(html).toContain('data-hz-topology-node-icon-no-handdrawn="true"');
    expect(html).toContain('data-hz-topology-g6-engine="antv-g6"');
    expect(html).toContain('data-hz-topology-g6-interaction-owner="hertzbeat-ui-g6-interaction"');
    expect(html).toContain('data-hz-topology-g6-node-selection="drawer-sync"');
    expect(html).toContain('data-hz-topology-g6-edge-selection="drawer-sync"');
    expect(html).toContain('data-hz-topology-g6-neighbor-highlight="metadata-only"');
    expect(html).toContain('data-hz-topology-g6-hover-state-engine="metadata-only-no-g6-state"');
    expect(html).toContain('data-hz-topology-g6-hover-owner="hertzbeat-ui-g6-hover"');
    expect(html).toContain('data-hz-topology-g6-hover-source="selection"');
    expect(html).toContain('data-hz-topology-g6-hovered-node="none"');
    expect(html).toContain('data-hz-topology-g6-hovered-edge="none"');
    expect(html).toContain('data-hz-topology-g6-active-focus-source="selection"');
    expect(html).toContain('data-hz-topology-g6-neighbor-focus-owner="hertzbeat-ui-g6-neighbor-focus"');
    expect(html).toContain('data-hz-topology-g6-focused-node="svc-checkout"');
    expect(html).toContain('data-hz-topology-g6-focused-edge="svc-checkout--db-orders"');
    expect(html).toContain('data-hz-topology-g6-upstream-node-count="0"');
    expect(html).toContain('data-hz-topology-g6-downstream-node-count="1"');
    expect(html).toContain('data-hz-topology-g6-dimmed-node-count="0"');
    expect(html).toContain('data-hz-topology-g6-focus-behavior="focus-element"');
    expect(html).toContain('data-hz-topology-g6-stage="antv-g6-stage"');
    expect(html).toContain('data-hz-topology-g6-node-count="2"');
    expect(html).toContain('data-hz-topology-g6-edge-count="1"');
    expect(html).toContain('data-topology-node="service-node"');
    expect(html).toContain('data-hz-topology-g6-neighbor-role="focus"');
    expect(html).toContain('data-hz-topology-g6-neighbor-role="downstream"');
    expect(html).toContain('data-hz-topology-g6-node-select-owner="hertzbeat-ui-g6-node-select"');
    expect(html).toContain('data-topology-node-owner="hertzbeat-ui-node"');
    expect(html).toContain('data-topology-node-metadata-owner="hertzbeat-ui-g6-node-metadata"');
    expect(html).toContain('data-topology-edge="service-edge"');
    expect(html).toContain('data-hz-topology-g6-neighbor-role="outgoing"');
    expect(html).toContain('data-hz-topology-g6-edge-select-owner="hertzbeat-ui-g6-edge-select"');
    expect(html).toContain('data-topology-edge-owner="hertzbeat-ui-edge"');
    expect(html).toContain('data-topology-edge-metadata-owner="hertzbeat-ui-g6-edge-metadata"');
    expect(html).toContain('data-hz-topology-g6-action="fit-view"');
    expect(html).toContain('data-hz-topology-g6-action="reset-view"');
    expect(html).not.toContain('rounded-[4px]');
    expect(html).not.toContain('rgba(96,165,250');
    expect(html).not.toContain('rgba(15,23,42');
  });
});
