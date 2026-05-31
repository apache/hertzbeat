import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  buildHzTopologyG6Graph,
  buildHzTopologyG6FilterScope,
  buildHzTopologyG6GroupSummary,
  buildHzTopologyG6LargeGraphStrategy,
  buildHzTopologyG6NeighborFocus,
  buildHzTopologyG6RenderWindow,
  buildHzTopologyG6ScaleFixture,
  buildHzTopologyG6ScaleProfile,
  buildHzTopologyG6SearchFocus,
  clampHzTopologyG6AutoFitZoom,
  getHzTopologyG6NodeIcon,
  HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM,
  HZ_TOPOLOGY_G6_MAX_ZOOM,
  HZ_TOPOLOGY_G6_NODE_ICON_CATALOG,
  HzTopologyG6Canvas
} from './topology-g6';

const topologyG6Source = readFileSync(new URL('./topology-g6.tsx', import.meta.url), 'utf8');

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
        iconName: 'component',
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

  it('uses a shared Lucide node icon catalog for supported topology entity types', () => {
    expect(HZ_TOPOLOGY_G6_NODE_ICON_CATALOG.map(item => [item.kind, item.iconName, item.label])).toEqual([
      ['application', 'app-window', 'Application'],
      ['service', 'component', 'Service'],
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

    expect(getHzTopologyG6NodeIcon('service')).toMatchObject({ kind: 'service', iconName: 'component' });
    expect(getHzTopologyG6NodeIcon('payment-api')).toMatchObject({ kind: 'service', iconName: 'component' });
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
    expect(source).toContain('increasedLineWidthForHitTesting');
    expect(source).toContain('readG6EventId(event)');
    expect(graphData.edges[0]?.style).toMatchObject({ increasedLineWidthForHitTesting: expect.any(Number) });
    expect(Number(graphData.edges[0]?.style.increasedLineWidthForHitTesting)).toBeGreaterThanOrEqual(14);
  });

  it('clears shared hover state when the pointer leaves the G6 canvas boundary', () => {
    const source = String(HzTopologyG6Canvas);

    expect(source).toContain('clearSharedHover');
    expect(source).toContain('handleG6CanvasPointerLeave');
    expect(source).toContain('onPointerLeave: handleG6CanvasPointerLeave');
    expect(source).toContain('"data-hz-topology-g6-hover-clear": "canvas-boundary"');
  });

  it('clears stale hover evidence before node or edge drawer selection', () => {
    const source = String(HzTopologyG6Canvas);
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas graph={graph} selectedNodeId="svc-checkout" selectedEdgeId="svc-checkout--db-orders" />
    );

    expect(html).toContain('data-hz-topology-g6-selection-clear="hover"');
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
    expect(html).toContain('data-hz-topology-g6-metadata-click-behavior="in-page-select"');
    expect(html).toContain('data-hz-topology-g6-metadata-click-target="node"');
    expect(html).toContain('data-hz-topology-g6-metadata-click-target="edge"');
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
    expect(html).toContain('data-topology-node-select-href="/topology?entityId=501&amp;depth=2"');
    expect(html).toContain('data-topology-node-focus-href="/topology?entityId=501&amp;depth=1"');
  });

  it('schedules a post-render overflow-only fit pass so small graphs are not magnified on first paint', () => {
    const source = topologyG6Source;
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} />);

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
    expect(html).toContain('data-hz-topology-g6-operator-zoom-bounds="0.18-2.2"');
    expect(html).toContain('data-hz-topology-g6-operator-zoom-growth="bounded-readable-nodes"');
    expect(html).toContain('data-hz-topology-g6-fit-mode="overflow-only-center"');
    expect(clampHzTopologyG6AutoFitZoom(4.8)).toBe(HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM);
    expect(clampHzTopologyG6AutoFitZoom(0.72)).toBe(0.72);
    expect(source).toContain('withG6AutoFitZoomRange(runtimeGraph, async () => {');
    expect(source).toContain('runtimeGraph.setZoomRange?.([HZ_TOPOLOGY_G6_MIN_ZOOM, HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM])');
    expect(source).toContain('runtimeGraph.setZoomRange?.([HZ_TOPOLOGY_G6_MIN_ZOOM, HZ_TOPOLOGY_G6_MAX_ZOOM])');
  });

  it('centers the shared G6 canvas after fit and reset view actions', () => {
    const source = topologyG6Source;
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={buildHzTopologyG6ScaleFixture(8)} />);

    expect(source).toContain('centerGraphView');
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

    expect(html).toContain('data-hz-topology-g6-operator-zoom-bounds="0.18-2.2"');
    expect(html).toContain('data-hz-topology-g6-wheel-zoom-bounds="0.18-2.2"');
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
    expect(source).toContain('stage.addEventListener("pointerdown", handleG6PointerViewportTelemetry)');
    expect(source).toContain('restoreG6ViewportSnapshot(runtimeGraph, resizeSnapshot)');
    expect(source).not.toContain("{ type: 'drag-element', key: 'drag-element' }");
    expect(source).not.toContain("{ type: 'click-select', key: 'click-select' }");
    expect(source).not.toContain("{ type: 'zoom-canvas', key: 'zoom-canvas'");
    expect(source).toContain('markUserViewportInteraction();');
    expect(source).toContain('setViewportInteractionState("operator-adjusted")');
    expect(source).toContain('const shouldFitAfterDataChange = graphStructureKey !== lastFitStructureKeyRef.current && !hasUserViewportInteractedRef.current;');
    expect(source).toContain('if (shouldFitAfterDataChange) {');
    expect(source).toContain('fitAndCenterG6Viewport(runtimeGraph, { when: "overflow" }, false)');
    expect(source).toContain('lastFitStructureKeyRef.current = graphStructureKey;');
    expect(source).toContain('autoFit: false');
    expect(source).not.toContain("autoFit: 'view'");
    expect(html).toContain('data-hz-topology-g6-auto-fit="initial-only"');
    expect(html).toContain('data-hz-topology-g6-auto-fit-owner="hertzbeat-ui-g6-auto-fit"');
    expect(html).toContain('data-hz-topology-g6-viewport-interaction-state="pristine"');
    expect(html).toContain('data-hz-topology-g6-viewport-interaction-owner="hertzbeat-ui-g6-viewport-interaction"');
    expect(html).toContain('data-hz-topology-g6-viewport-preservation="clamped-wheel-pan-zoom"');
    expect(html).toContain('data-hz-topology-g6-style-redraw-behavior="no-auto-fit"');
    expect(html).toContain('data-hz-topology-g6-style-redraw-skip="identical-render-key"');
    expect(html).toContain('data-hz-topology-g6-blank-hover-clear="no-op-without-hover"');
    expect(html).toContain('data-hz-topology-g6-resize-preservation="operator-viewport-snapshot"');
    expect(html).toContain('data-hz-topology-g6-node-motion="locked-layout"');
    expect(html).toContain('data-hz-topology-g6-selection-engine="hertzbeat-controlled"');
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

  it('windows stress scale graphs before they enter the G6 render data path', () => {
    const stressGraph = buildHzTopologyG6ScaleFixture(500);
    const renderWindow = buildHzTopologyG6RenderWindow(stressGraph);
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={stressGraph} height="compact" />);
    const source = String(HzTopologyG6Canvas);

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
    expect(html).toContain('data-hz-topology-g6-render-window-owner="hertzbeat-ui-g6-render-window"');
    expect(html).toContain('data-hz-topology-g6-render-window-mode="windowed"');
    expect(html).toContain('data-hz-topology-g6-render-window-visible-node-budget="200"');
    expect(html).toContain('data-hz-topology-g6-render-window-rendered-node-count="200"');
    expect(html).toContain('data-hz-topology-g6-render-window-hidden-node-count="300"');
    expect(html).toContain('data-hz-topology-g6-render-window-table-companion="required"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-owner="hertzbeat-ui-g6-mount-lifecycle"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-policy="structure-layout-height-only"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-redraw-policy="setData-draw-preserve-viewport"');
    expect(html).toContain('data-hz-topology-g6-mount-lifecycle-structure-key=');
    expect(source).toContain('buildHzTopologyG6Graph(renderWindow.graph)');
    expect(source).not.toContain('buildHzTopologyG6Graph(canvasGraph)');
    expect(source).toContain('"data-hz-topology-g6-mount-lifecycle-policy": "structure-layout-height-only"');
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
      totalCollapsedNodeCount: 0
    });
    expect(groupSummary.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'database-middleware-connection',
          nodeCount: 1,
          edgeCount: 1,
          collapsedNodeCount: 0,
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
    expect(html).toContain('data-hz-topology-g6-group-collapsed-node-count="0"');
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
    expect(html).toContain('data-hz-topology-g6-action="focus-search-result"');
    expect(html).toContain('data-hz-topology-g6-search-match="true"');
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

  it('preserves the G6 viewport around structural graph data redraws', () => {
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} selectedEdgeId="svc-checkout--db-orders" />);
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-viewport-redraw-preservation="zoom-position"');
    expect(html).toContain('data-hz-topology-g6-viewport-redraw-preservation-owner="hertzbeat-ui-g6-viewport-redraw-preservation"');
    expect(source).toContain('captureG6ViewportSnapshot');
    expect(source).toContain('restoreG6ViewportSnapshot');
    expect(source).toContain('captureG6ViewportSnapshot(runtimeGraph)');
    expect(source).toContain('restoreG6ViewportSnapshot(runtimeGraph, snapshot)');
    expect(source).toContain('shouldPreserveViewportAfterRedraw');
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

  it('keeps node hover as highlight-only so it cannot recenter an operator-zoomed G6 viewport', () => {
    const html = renderToStaticMarkup(<HzTopologyG6Canvas graph={graph} hoveredNodeId="db-orders" selectedNodeId="svc-checkout" />);
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-hover-viewport-behavior="highlight-only"');
    expect(html).toContain('data-hz-topology-g6-hover-viewport-owner="hertzbeat-ui-g6-hover-viewport"');
    expect(html).toContain('data-hz-topology-g6-selection-auto-focus="explicit-action-only"');
    expect(html).toContain('data-hz-topology-g6-selection-auto-focus-owner="hertzbeat-ui-g6-selection-auto-focus"');
    expect(source).toContain('const shouldFocusViewportElement = activeFocusSource === "search-node";');
    expect(source).toContain('const shouldAutoFocusSearchResult = shouldFocusViewportElement && !hasUserViewportInteractedRef.current;');
    expect(source).toContain('if (shouldAutoFocusSearchResult && activeFocusNodeId) runtimeGraph.focusElement?.(activeFocusNodeId, { duration: 180 });');
    expect(source).not.toContain('if (shouldFocusViewportElement && activeFocusNodeId) runtimeGraph.focusElement?.(activeFocusNodeId, { duration: 180 });');
    expect(source).not.toContain('const shouldFocusViewportElement = activeFocusSource === "search-node" || activeFocusSource === "selection";');
    expect(source).not.toContain('if (activeFocusNodeId) runtimeGraph.focusElement?.(activeFocusNodeId, { duration: 180 });');
  });

  it('does not restore search focus after operator zoom when hover clears back to search-node focus', () => {
    const html = renderToStaticMarkup(
      <HzTopologyG6Canvas graph={graph} searchQuery="Checkout" hoveredNodeId="db-orders" selectedNodeId="svc-checkout" />
    );
    const source = String(HzTopologyG6Canvas);

    expect(html).toContain('data-hz-topology-g6-search-auto-focus="initial-before-operator-interaction"');
    expect(html).toContain('data-hz-topology-g6-search-auto-focus-owner="hertzbeat-ui-g6-search-auto-focus"');
    expect(html).toContain('data-hz-topology-g6-search-auto-focus-guard="operator-viewport-interaction"');
    expect(source).toContain('const shouldAutoFocusSearchResult = shouldFocusViewportElement && !hasUserViewportInteractedRef.current;');
    expect(source).toContain('[activeFocusNodeId, renderState, shouldAutoFocusSearchResult]');
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
    expect(source).toContain('buildHzTopologyG6Graph(renderWindow.graph)');
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
    expect(html).toContain('data-hz-topology-g6-wheel-zoom-bounds="0.18-2.2"');
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
    expect(source).toContain('const nextZoom = Math.max(HZ_TOPOLOGY_G6_MIN_ZOOM, Math.min(HZ_TOPOLOGY_G6_MAX_ZOOM, currentZoom * scale))');
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
    expect(source).toContain('scheduleInitialFitView(runtimeGraph, () => !hasUserViewportInteractedRef.current)');
    expect(source).toContain('publishViewportTelemetryAfterViewportAction("wheel"');
    expect(source).toContain('publishViewportTelemetry("pointer-pan")');
    expect(source).toContain('publishViewportTelemetry("redraw-restore")');
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
