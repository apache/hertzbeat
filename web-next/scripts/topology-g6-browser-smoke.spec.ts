import { expect, test } from 'playwright/test';

const baseUrl = process.env.TOPOLOGY_G6_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const BROWSER_SMOKE_TIMEOUT = 180000;
const TOPOLOGY_READY_TIMEOUT = 120000;
const smokeUsername = process.env.TOPOLOGY_G6_BROWSER_USERNAME;
const smokePassword = process.env.TOPOLOGY_G6_BROWSER_PASSWORD;
const topologyRoute = process.env.TOPOLOGY_G6_BROWSER_ROUTE;
const expectedNodeCount = process.env.TOPOLOGY_G6_BROWSER_EXPECTED_NODES;
const expectedEdgeCount = process.env.TOPOLOGY_G6_BROWSER_EXPECTED_EDGES;
const expectedRuntimeVersion = process.env.TOPOLOGY_G6_BROWSER_EXPECTED_RUNTIME_VERSION;
const expectedInitialFitStrategy = process.env.TOPOLOGY_G6_BROWSER_EXPECTED_INITIAL_FIT_STRATEGY;
const expectedWideZoom = process.env.TOPOLOGY_G6_BROWSER_EXPECTED_WIDE_ZOOM;
const expectedOperatorBounds = process.env.TOPOLOGY_G6_BROWSER_EXPECTED_OPERATOR_BOUNDS;
const configuredFocusNodeId = process.env.TOPOLOGY_G6_BROWSER_FOCUS_NODE_ID;
const hasSmokeConfig = Boolean(smokeUsername && smokePassword && topologyRoute);

type TopologyG6State = {
  url: string;
  traceState: string | null;
  selectionSource: string | null;
  selectionNode: string | null;
  nodeCount: string | null;
  edgeCount: string | null;
  renderState: string | null;
  zoom: string | null;
  position: string | null;
  structureKey: string | null;
  renderKey: string | null;
  hoveredNode: string | null;
  selectedNode: string | null;
  drawerNode: string | null;
  selectHrefCount: number;
  selectModeCount: number;
  runtimeVersion: string | null;
  initialFitStrategy: string | null;
  operatorBounds: string | null;
  stageRect: { x: number; y: number; width: number; height: number } | null;
};

async function authenticateViaBffCookie(page: import('playwright/test').Page) {
  const response = await page.context().request.post(`${baseUrl}/api/account/auth/form`, {
    data: {
      type: 0,
      identifier: smokeUsername,
      credential: smokePassword
    },
    timeout: TOPOLOGY_READY_TIMEOUT
  });
  expect(response.ok()).toBe(true);
  const message = await response.json();
  expect(message?.code).toBe(0);
  expect(message?.data?.authenticated).toBe(true);
}

async function waitForReadyTopology(page: import('playwright/test').Page) {
  expect(topologyRoute).toBeTruthy();
  await page.goto(`${baseUrl}${topologyRoute!}`, {
    timeout: BROWSER_SMOKE_TIMEOUT,
    waitUntil: 'domcontentloaded'
  });
  await page.waitForSelector('[data-hz-ui="topology-g6-canvas"][data-hz-topology-g6-render-state="ready"]', {
    timeout: TOPOLOGY_READY_TIMEOUT
  });
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-hz-ui="topology-g6-canvas"]');
    return (
      Number(root?.getAttribute('data-hz-topology-g6-node-count') ?? '0') > 0
      && Number(root?.getAttribute('data-hz-topology-g6-edge-count') ?? '0') > 0
      && root?.getAttribute('data-hz-topology-g6-viewport-zoom') !== 'unknown'
    );
  }, { timeout: TOPOLOGY_READY_TIMEOUT });
}

async function readTopologyState(page: import('playwright/test').Page): Promise<TopologyG6State> {
  return page.evaluate(() => {
    const route = document.querySelector('[data-topology-route="hertzbeat-entity-topology"]');
    const root = document.querySelector('[data-hz-ui="topology-g6-canvas"]');
    const stage = document.querySelector('[data-hz-topology-g6-stage="antv-g6-stage"]');
    const rect = stage?.getBoundingClientRect();

    return {
      url: location.href,
      traceState: route?.getAttribute('data-topology-trace-call-state') ?? null,
      selectionSource: route?.getAttribute('data-topology-selection-source') ?? null,
      selectionNode: route?.getAttribute('data-topology-selection-node-id') ?? null,
      nodeCount: root?.getAttribute('data-hz-topology-g6-node-count') ?? null,
      edgeCount: root?.getAttribute('data-hz-topology-g6-edge-count') ?? null,
      renderState: root?.getAttribute('data-hz-topology-g6-render-state') ?? null,
      zoom: root?.getAttribute('data-hz-topology-g6-viewport-zoom') ?? null,
      position: root?.getAttribute('data-hz-topology-g6-viewport-position') ?? null,
      structureKey: root?.getAttribute('data-hz-topology-g6-mount-lifecycle-structure-key') ?? null,
      renderKey: root?.getAttribute('data-hz-topology-g6-mount-lifecycle-render-key') ?? null,
      hoveredNode: root?.getAttribute('data-hz-topology-g6-hovered-node') ?? null,
      selectedNode: root?.getAttribute('data-hz-topology-g6-selected-node') ?? null,
      drawerNode:
        document.querySelector('[data-topology-current-entity-panel]')?.getAttribute('data-topology-current-entity-panel')
        ?? null,
      selectHrefCount: document.querySelectorAll('[data-topology-node-select-href]').length,
      selectModeCount: document.querySelectorAll('[data-topology-node-select-mode="in-page-drawer"]').length,
      runtimeVersion: root?.getAttribute('data-hz-topology-g6-runtime-version') ?? null,
      initialFitStrategy: root?.getAttribute('data-hz-topology-g6-initial-fit-strategy') ?? null,
      operatorBounds: root?.getAttribute('data-hz-topology-g6-operator-zoom-bounds') ?? null,
      stageRect: rect
        ? {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        : null
    };
  });
}

async function findNonFocusNodeByMousePath(
  page: import('playwright/test').Page,
  state: TopologyG6State,
  focusNodeId: string
) {
  expect(state.stageRect).toBeTruthy();
  const rect = state.stageRect!;

  for (let y = rect.y + 180; y <= rect.y + rect.height - 80; y += 14) {
    for (let x = rect.x + 120; x <= rect.x + rect.width - 80; x += 14) {
      await page.mouse.move(x, y);
      await page.waitForTimeout(20);
      const hoveredNode = await page.evaluate(() =>
        document.querySelector('[data-hz-ui="topology-g6-canvas"]')?.getAttribute('data-hz-topology-g6-hovered-node')
      );
      if (hoveredNode && hoveredNode !== 'none' && hoveredNode !== focusNodeId) {
        return { x, y, hoveredNode };
      }
    }
  }

  throw new Error('Could not find a non-focus topology node through a real mouse path.');
}

test.describe('topology G6 browser smoke', () => {
  test.skip(!hasSmokeConfig, 'Set TOPOLOGY_G6_BROWSER_USERNAME/PASSWORD/ROUTE to run the optional local G6 smoke.');

  test('keeps real node inspection in-page after wheel zoom and mouse hover', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);
    await authenticateViaBffCookie(page);
    await waitForReadyTopology(page);

    const before = await readTopologyState(page);
    expect(before.traceState).toBe('ready');
    if (expectedNodeCount) {
      expect(before.nodeCount).toBe(expectedNodeCount);
    }
    if (expectedEdgeCount) {
      expect(before.edgeCount).toBe(expectedEdgeCount);
    }
    expect(before.selectHrefCount).toBe(0);
    expect(before.selectModeCount).toBeGreaterThan(0);
    if (expectedRuntimeVersion) {
      expect(before.runtimeVersion).toBe(expectedRuntimeVersion);
    }

    const centerX = before.stageRect!.x + Math.round(before.stageRect!.width * 0.5);
    const centerY = before.stageRect!.y + Math.round(before.stageRect!.height * 0.48);
    await page.mouse.move(centerX, centerY);
    await page.mouse.wheel(0, 620);
    await page.waitForTimeout(500);
    const afterZoom = await readTopologyState(page);
    expect(afterZoom.zoom).not.toBe(before.zoom);
    expect(afterZoom.structureKey).toBe(before.structureKey);
    expect(afterZoom.renderKey).toBe(before.renderKey);

    const focusNodeId = configuredFocusNodeId ?? before.selectedNode ?? before.selectionNode ?? 'none';
    const target = await findNonFocusNodeByMousePath(page, before, focusNodeId);
    const afterHover = await readTopologyState(page);
    expect(afterHover.hoveredNode).toBe(target.hoveredNode);
    expect(afterHover.zoom).toBe(afterZoom.zoom);
    expect(afterHover.position).toBe(afterZoom.position);

    await page.mouse.click(target.x, target.y);
    await page.waitForTimeout(700);
    const afterClick = await readTopologyState(page);

    expect(afterClick.url).toBe(before.url);
    expect(afterClick.renderState).toBe('ready');
    expect(afterClick.structureKey).toBe(before.structureKey);
    expect(afterClick.renderKey).toBe(before.renderKey);
    expect(afterClick.zoom).toBe(afterZoom.zoom);
    expect(afterClick.position).toBe(afterZoom.position);
    expect(afterClick.selectionSource).toBe('node-click');
    expect(afterClick.selectionNode).toBe(target.hoveredNode);
    expect(afterClick.selectedNode).toBe(target.hoveredNode);
    expect(afterClick.drawerNode).toBe(target.hoveredNode);
    expect(afterClick.selectHrefCount).toBe(0);
  });

  test('keeps compact service graphs at 1x in a wide fresh browser viewport', async ({ browser }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);
    const context = await browser.newContext({
      viewport: { width: 2048, height: 960 },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();

    await authenticateViaBffCookie(page);
    await waitForReadyTopology(page);
    await page.waitForTimeout(1200);

    const state = await readTopologyState(page);
    expect(state.traceState).toBe('ready');
    if (expectedNodeCount) {
      expect(state.nodeCount).toBe(expectedNodeCount);
    }
    if (expectedEdgeCount) {
      expect(state.edgeCount).toBe(expectedEdgeCount);
    }
    if (expectedInitialFitStrategy) {
      expect(state.initialFitStrategy).toBe(expectedInitialFitStrategy);
    }
    if (expectedWideZoom) {
      expect(state.zoom).toBe(expectedWideZoom);
    }
    if (expectedOperatorBounds) {
      expect(state.operatorBounds).toBe(expectedOperatorBounds);
    }
    if (expectedRuntimeVersion) {
      expect(state.runtimeVersion).toBe(expectedRuntimeVersion);
    }

    await context.close();
  });
});
