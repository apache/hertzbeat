import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const pageEntryNames = new Set(['page.tsx', 'page.ts', 'page.jsx', 'page.js']);
const pageTestNames = ['page.test.tsx', 'page.test.ts', 'page.test.jsx', 'page.test.js'];

export const workflowFamilies = [
  {
    key: 'entity',
    label: 'Entity object lifecycle',
    routePrefixes: ['/entities'],
    browserEvidencePatterns: [/entity-.*\.chrome\.test\.ts$/, /entity.*browser.*\.spec\.ts$/]
  },
  {
    key: 'monitor',
    label: 'Monitor create, detect, detail, and edit',
    routePrefixes: ['/monitors'],
    browserEvidencePatterns: [/monitor-.*\.chrome\.test\.ts$/, /monitor.*browser.*\.spec\.ts$/]
  },
  {
    key: 'alert',
    label: 'Alert authoring and operations',
    routePrefixes: ['/alert', '/alerts'],
    browserEvidencePatterns: [/alert-.*\.chrome\.test\.ts$/]
  },
  {
    key: 'settings',
    label: 'Settings and platform configuration',
    routePrefixes: ['/setting'],
    browserEvidencePatterns: [/settings-.*\.chrome\.test\.ts$/, /milestone4-auth-settings\.chrome\.test\.ts$/]
  },
  {
    key: 'observability',
    label: 'Logs, traces, and OTLP investigation',
    routePrefixes: ['/log', '/trace', '/ingestion/otlp'],
    browserEvidencePatterns: [/three-signal-.*\.chrome\.test\.ts$/, /(log|trace).*browser-smoke\.spec\.ts$/]
  },
  {
    key: 'operator',
    label: 'Operator overview, navigation, and investigation shell',
    routePrefixes: [
      '/',
      '/actions',
      '/bulletin',
      '/dashboard',
      '/events',
      '/exception',
      '/explorer',
      '/incidents',
      '/overview',
      '/topology',
      '/ui-lab'
    ],
    browserEvidencePatterns: [
      /operator-family\.chrome\.test\.ts$/,
      /app-frame\.chrome\.test\.tsx$/,
      /overview\.chrome\.test\.ts$/,
      /topology-g6-browser-smoke\.spec\.ts$/,
      /bulletin-.*\.chrome\.test\.ts$/,
      /bulletin-browser-smoke\.spec\.ts$/
    ]
  },
  {
    key: 'auth',
    label: 'Authentication and session recovery',
    routePrefixes: ['/login', '/passport'],
    browserEvidencePatterns: [
      /passport-login-browser-smoke\.spec\.ts$/,
      /auth-recovery\.chrome\.test\.ts$/,
      /milestone4-auth-settings\.chrome\.test\.ts$/
    ]
  },
  {
    key: 'public-status',
    label: 'Public status and external visibility',
    routePrefixes: ['/status'],
    browserEvidencePatterns: [/milestone5-final-sweep\.chrome\.test\.ts$/, /release-route-browser-smoke\.spec\.ts$/]
  }
];

export const noviceActionExpectations = [
  {
    key: 'entity',
    actions: [
      { key: 'list-scale-pagination', label: 'List, scale, search, and pagination', filePatterns: [/^app\/entities\/page\.test\.tsx$/, /^components\/pages\/entity-list-surface\.test\.tsx$/], contentPatterns: [/5000|pagination jumps bounded|pageSize|payload|search/i] },
      { key: 'list-payload-recovery', label: 'Recover from oversized entity list payloads', filePatterns: [/^components\/pages\/entity-list-surface\.test\.tsx$/], contentPatterns: [/oversized backend payload feedback|payload-trimmed-refresh|payload-trimmed-clear/i] },
      { key: 'create-save-validation', label: 'Validate and save a new entity, then route to detail', filePatterns: [/^components\/pages\/entity-editor-surface\.test\.tsx$/], contentPatterns: [/blocks blank novice entity creates|routes to detail|data-entity-editor-validation="name"/i] },
      { key: 'post-create-detail-return-route', label: 'Keep post-create detail readback tied to the source entity list', filePatterns: [/^app\/entities\/\[entityId\]\/page\.test\.tsx$/], contentPatterns: [/novice post-create detail route|data-entity-detail-route-return-to|product-design-1719/i] },
      { key: 'post-create-readback-guide', label: 'Read a newly created entity and choose the next evidence setup step', filePatterns: [/^components\/pages\/entity-detail-surface\.test\.tsx$/], contentPatterns: [/post-create success|novice next-step|data-entity-detail-created-guide-copy|data-entity-detail-created-guide-target/i] },
      { key: 'edit-save-readback', label: 'Save entity edits and route back to detail for readback', filePatterns: [/^components\/pages\/entity-editor-surface\.test\.tsx$/], contentPatterns: [/saves novice entity edits|routes back to detail for readback|apiMessagePut/i] },
      { key: 'create', label: 'Create an entity', filePatterns: [/^app\/entities\/new\/page\.test\.tsx$/], contentPatterns: [/create mode|new route|new-draft|candidate/i] },
      { key: 'edit', label: 'Edit an entity', filePatterns: [/^app\/entities\/\[entityId\]\/edit\/page\.test\.tsx$/], contentPatterns: [/edit mode|edit route|missing edit|retry/i] },
      { key: 'detail', label: 'Inspect entity detail', filePatterns: [/^app\/entities\/\[entityId\]\/page\.test\.tsx$/], contentPatterns: [/detail|overview|related|drilldown/i] },
      { key: 'detail-delete-confirmation', label: 'Confirm impact before deleting an entity detail', filePatterns: [/^components\/pages\/entity-detail-surface\.test\.tsx$/], contentPatterns: [/guards novice entity deletion|delete-impact-summary|delete-impact-warning|toHaveBeenCalledWith\(42\)/i] },
      { key: 'discovery', label: 'Discover candidate entities', filePatterns: [/^app\/entities\/discovery\/page\.test\.tsx$/], contentPatterns: [/discovery|candidate/i] },
      { key: 'import', label: 'Import entity definitions', filePatterns: [/^app\/entities\/import\/page\.test\.tsx$/], contentPatterns: [/import|route context|delete success/i] }
    ]
  },
  {
    key: 'monitor',
    actions: [
      { key: 'list-actions', label: 'List, filter, batch, import, delete, and response actions', filePatterns: [/^app\/monitors\/page\.test\.tsx$/], contentPatterns: [/filter|batch|import|delete|response/i] },
      { key: 'create', label: 'Create a monitor', filePatterns: [/^app\/monitors\/new\/page\.test\.tsx$/], contentPatterns: [/new route|new-monitor|monitor form|app query/i] },
      { key: 'detect-return-context', label: 'Detect a monitor and return to the originating context', filePatterns: [/^components\/pages\/monitor-editor-surface\.test\.tsx$/], contentPatterns: [/successful detect action|detect-return-action|Return to context|originating context/i] },
      { key: 'edit', label: 'Edit a monitor', filePatterns: [/^app\/monitors\/\[monitorId\]\/edit\/page\.test\.tsx$/], contentPatterns: [/edit route|edit-monitor|monitor id|load failures/i] },
      { key: 'detail', label: 'Inspect monitor detail and metrics', filePatterns: [/^app\/monitors\/\[monitorId\]\/page\.test\.tsx$/], contentPatterns: [/detail|metrics|history|refresh|favorite/i] }
    ]
  },
  {
    key: 'alert',
    actions: [
      { key: 'center-operations', label: 'Triage, batch, silence, inhibit, and refresh alerts', filePatterns: [/^app\/alert\/page\.test\.tsx$/, /^components\/pages\/alert-center-surface\.test\.tsx$/], contentPatterns: [/batch|silence|inhibit|refresh|closure/i] },
      { key: 'threshold-authoring', label: 'Author threshold rules', filePatterns: [/^app\/alert\/setting\/page\.test\.tsx$/, /^components\/pages\/alert-setting-create-dialog\.test\.tsx$/], contentPatterns: [/threshold|create|preview|validation|save/i] },
      { key: 'threshold-preview-save-guard', label: 'Block unsafe enabled threshold saves after failed preview evidence', filePatterns: [/^components\/pages\/alert-setting-create-dialog\.test\.tsx$/], contentPatterns: [/failed preview evidence|failed-preview-enabled|disabled drafts save/i] },
      { key: 'notice-authoring', label: 'Author receivers, rules, and templates', filePatterns: [/^app\/alert\/notice\/page\.test\.tsx$/], contentPatterns: [/receiver|rule|template|notice/i] },
      { key: 'notice-receiver-token-normalization', label: 'Normalize pasted robot receiver URLs while authoring notices', filePatterns: [/^components\/pages\/alert-notice-receiver-fields\.test\.tsx$/], contentPatterns: [/normalizes pasted DingTalk robot URLs|ding-access-token|accessToken: 'ding-token'/i] },
      { key: 'silence-authoring', label: 'Author silence rules', filePatterns: [/^app\/alert\/silence\/page\.test\.tsx$/], contentPatterns: [/silence|author|save|validation/i] },
      { key: 'inhibit-authoring', label: 'Author inhibit rules', filePatterns: [/^app\/alert\/inhibit\/page\.test\.tsx$/], contentPatterns: [/inhibit|author|save|validation/i] },
      { key: 'alerts-alias-context', label: 'Recover legacy alerts entry traffic with filters intact', filePatterns: [/^app\/alerts\/page\.test\.ts$/], contentPatterns: [/redirects alerts compatibility traffic|preserves alert filters and machine context|returnLabel/i] }
    ]
  },
  {
    key: 'settings',
    actions: [
      { key: 'server-save', label: 'Save message server settings', filePatterns: [/^app\/setting\/settings\/server\/page\.test\.tsx$/], contentPatterns: [/save|dirty|validation|required|tls/i] },
      { key: 'server-email-save-apply-feedback', label: 'Apply email message server changes and confirm feedback', filePatterns: [/^app\/setting\/settings\/server\/page\.test\.tsx$/], contentPatterns: [/saves a changed email server draft|apiMessagePost|apply feedback/i] },
      { key: 'object-store-save', label: 'Save object store settings', filePatterns: [/^app\/setting\/settings\/object-store\/page\.test\.tsx$/], contentPatterns: [/object-store|apply|discard|validation/i] },
      { key: 'token-actions', label: 'Generate, copy, and revoke tokens', filePatterns: [/^app\/setting\/settings\/token\/page\.test\.tsx$/], contentPatterns: [/token|generation|copy|revoke|refreshes/i] },
      { key: 'define-edit', label: 'Edit monitoring templates and definitions', filePatterns: [/^app\/setting\/define\/page\.test\.tsx$/], contentPatterns: [/YML|save|delete|new draft|template/i] },
      { key: 'status-settings', label: 'Configure status pages', filePatterns: [/^app\/setting\/status\/page\.test\.tsx$/], contentPatterns: [/status|incident|tab|mutations/i] }
    ]
  },
  {
    key: 'observability',
    actions: [
      { key: 'log-search-stream', label: 'Search logs and inspect stream detail', filePatterns: [/^app\/log\/manage\/page\.test\.tsx$/, /^app\/log\/stream\/page\.test\.tsx$/], contentPatterns: [/search|stream|detail|trace|filter/i] },
      { key: 'log-stream-return-context', label: 'Return from log stream to the source trace investigation', filePatterns: [/^app\/log\/manage\/page\.test\.tsx$/], contentPatterns: [/trace return action clickable|data-log-manage-return-action|return-source|mockState\.replace\)\.not\.toHaveBeenCalled/i] },
      { key: 'trace-search-detail', label: 'Search traces and open details', filePatterns: [/^app\/trace\/manage\/page\.test\.tsx$/], contentPatterns: [/trace|search|detail|span|waterfall/i] },
      { key: 'otlp-ingestion', label: 'Inspect OTLP ingestion and metrics', filePatterns: [/^app\/ingestion\/otlp\/page\.test\.tsx$/, /^app\/ingestion\/otlp\/metrics\/page\.test\.tsx$/], contentPatterns: [/OTLP|ingestion|metrics|candidate/i] }
    ]
  },
  {
    key: 'operator',
    actions: [
      { key: 'shell-primary-navigation-map', label: 'Find primary workflows from the shared shell navigation', filePatterns: [/^lib\/shell\/sidebar\.test\.ts$/], contentPatterns: [/novice primary navigation map|entities\/new|log\/stream|alert\/integration/i] },
      { key: 'overview', label: 'Inspect overview console', filePatterns: [/^app\/overview\/page\.test\.tsx$/], contentPatterns: [/overview|refresh|dashboard|panel|fallback/i] },
      { key: 'topology', label: 'Inspect topology workbench', filePatterns: [/^app\/topology\/page\.test\.tsx$/], contentPatterns: [/topology|G6|node|edge|graph/i] },
      { key: 'actions', label: 'Use action workbench', filePatterns: [/^app\/actions\/page\.test\.tsx$/], contentPatterns: [/actions|suggested|remediation|confirmed/i] },
      { key: 'incidents', label: 'Use incident workbench', filePatterns: [/^app\/incidents\/page\.test\.tsx$/], contentPatterns: [/incident|search|pagination|workbench/i] },
      { key: 'dashboard', label: 'Use dashboard draft workspace', filePatterns: [/^app\/dashboard\/page\.test\.ts$/], contentPatterns: [/dashboard|draft|panel|workspace/i] },
      { key: 'explorer', label: 'Use explorer frame', filePatterns: [/^app\/explorer\/page\.test\.tsx$/], contentPatterns: [/explorer|handoff|empty|localized/i] },
      { key: 'root-overview-redirect', label: 'Start from the root shell and land in overview with context intact', filePatterns: [/^app\/page\.test\.ts$/], contentPatterns: [/redirects the shell entry point to the overview workbench|preserves machine query context|returnLabel/i] },
      { key: 'events-log-redirect', label: 'Recover legacy events traffic into the log explorer', filePatterns: [/^app\/events\/page\.test\.ts$/], contentPatterns: [/redirects events compatibility traffic|preserves log filters and machine context|returnLabel/i] },
      { key: 'exception-recovery', label: 'Recover from unsupported exception routes with the right error surface', filePatterns: [/^app\/exception\/\[type\]\/page\.test\.tsx$/], contentPatterns: [/shared exception center surface|normalizes unsupported exception route params/i] },
      { key: 'bulletin-center', label: 'Inspect bulletin boards through the controller-backed workbench', filePatterns: [/^app\/bulletin\/page\.test\.tsx$/], contentPatterns: [/shared bulletin center surface|controller-backed load path|settled cache window/i] }
    ]
  },
  {
    key: 'auth',
    actions: [
      { key: 'login', label: 'Log in and recover session', filePatterns: [/^app\/passport\/login\/page\.test\.tsx$/, /^components\/pages\/login-form.*\.test\.tsx$/], contentPatterns: [/login|redirect|session|submit/i] }
    ]
  },
  {
    key: 'public-status',
    actions: [
      { key: 'public-read', label: 'Read public status pages', filePatterns: [/^app\/status\/public\/page\.test\.tsx$/, /^components\/pages\/public-status-shell\.test\.tsx$/], contentPatterns: [/public status|status shell|incident|year filter/i] },
      { key: 'status-manage', label: 'Manage status pages', filePatterns: [/^app\/setting\/status\/page\.test\.tsx$/], contentPatterns: [/status|management|incident|mutations/i] },
      { key: 'status-incident-row-guard', label: 'Update and delete public status incidents with confirmation', filePatterns: [/^components\/pages\/status-setting-surface\.test\.tsx$/], contentPatterns: [/guards novice incident updates and deletion|data-status-incident-delete-confirm-trigger|data-status-delete-confirm-ok/i] }
    ]
  }
];

function walkFiles(rootDir) {
  const results = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function routePathFromPageFile(appRoot, pageFile) {
  const relativeDir = path.relative(appRoot, path.dirname(pageFile));
  if (!relativeDir) {
    return '/';
  }
  return `/${relativeDir.split(path.sep).join('/')}`;
}

function findAdjacentPageTest(routeDir) {
  return pageTestNames
    .map(testName => path.join(routeDir, testName))
    .find(candidate => fs.existsSync(candidate)) || null;
}

function normalizeRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function findBrowserEvidenceFiles(rootDir, patterns) {
  const appRoot = path.join(rootDir, 'app');
  const scriptRoot = path.join(rootDir, 'scripts');
  const candidateRoots = [appRoot, scriptRoot].filter(candidate => fs.existsSync(candidate));
  const files = candidateRoots.flatMap(walkFiles);
  return files
    .filter(filePath => patterns.some(pattern => pattern.test(normalizeRelative(rootDir, filePath))))
    .map(filePath => normalizeRelative(rootDir, filePath))
    .sort();
}

function findActionEvidenceFiles(rootDir, patterns) {
  const candidateRoots = ['app', 'components', 'lib', 'scripts']
    .map(name => path.join(rootDir, name))
    .filter(candidate => fs.existsSync(candidate));
  const files = candidateRoots.flatMap(walkFiles);
  return files
    .filter(filePath => patterns.some(pattern => pattern.test(normalizeRelative(rootDir, filePath))))
    .map(filePath => normalizeRelative(rootDir, filePath))
    .sort();
}

function actionEvidenceMatchesContent(rootDir, evidenceFiles, contentPatterns = []) {
  if (contentPatterns.length === 0) return true;
  const combinedEvidence = evidenceFiles
    .map(file => fs.readFileSync(path.join(rootDir, file), 'utf8'))
    .join('\n');
  return contentPatterns.some(pattern => pattern.test(combinedEvidence));
}

function defaultFreshBrowserAuditPath(rootDir) {
  return path.resolve(rootDir, '..', '.tmp', 'product-design', 'current-all-route-browser-audit.json');
}

function readFreshBrowserAuditEvidence(rootDir, override) {
  if (override === false) return null;
  if (override && typeof override === 'object') return override;
  const evidencePath = defaultFreshBrowserAuditPath(rootDir);
  if (!fs.existsSync(evidencePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  } catch {
    return null;
  }
}

function routePatternMatchesRequestedPath(routePattern, requestedPath) {
  const escapedParts = routePattern.split('/').map(part => {
    if (part.startsWith('[...') || part.startsWith('[[...')) return '.+';
    if (part.startsWith('[')) return '[^/]+';
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return new RegExp(`^${escapedParts.join('/')}$`).test(requestedPath);
}

export function evaluateFreshBrowserScreenshotAudit(routePathsOrCount, evidence) {
  const sourceRoutePaths = Array.isArray(routePathsOrCount) ? routePathsOrCount : [];
  const sourceRouteCount = Array.isArray(routePathsOrCount) ? routePathsOrCount.length : routePathsOrCount;
  const evidenceRoutes = Array.isArray(evidence?.routes) ? evidence.routes : [];
  const auditedRouteCount = Number(evidence?.expectedRouteCount) || sourceRouteCount;
  const requestedPaths = evidenceRoutes.map(route => {
    try {
      return new URL(route?.requested || '', 'http://product-design.local').pathname;
    } catch {
      return '';
    }
  });
  const sourceRoutesCovered = sourceRoutePaths.length === 0
    || sourceRoutePaths.every(routePath => requestedPaths.some(requestedPath => routePatternMatchesRequestedPath(routePath, requestedPath)));
  const routeEvidenceValid = evidenceRoutes.length === auditedRouteCount
    && new Set(evidenceRoutes.map(route => route?.requested)).size === auditedRouteCount
    && sourceRoutesCovered
    && evidenceRoutes.every(route =>
      route?.snapshot === true
      && route?.error == null
      && typeof route?.screenshot === 'string'
      && route.screenshot.length > 0
      && Number(route?.bytes) > 0
      && route?.loading === false
      && route?.h404 === false
      && route?.h500 === false
      && route?.nextError === false
      && route?.overflowX === false
    );
  const invalidRoutes = Array.isArray(evidence?.invalid) ? evidence.invalid : [];
  const valid = evidence?.valid === true
    && evidence?.verifiedRouteCount === auditedRouteCount
    && evidence?.acceptedRouteCount === auditedRouteCount
    && invalidRoutes.length === 0
    && routeEvidenceValid;

  return {
    asserted: Boolean(evidence),
    valid,
    evidenceKind: 'fresh-current-run-screenshots',
    routeCount: auditedRouteCount,
    sourceRouteCount,
    sourceRouteCoverageCount: sourceRoutePaths.length === 0
      ? sourceRouteCount
      : sourceRoutePaths.filter(routePath => requestedPaths.some(requestedPath => routePatternMatchesRequestedPath(routePath, requestedPath))).length,
    verifiedRouteCount: valid ? auditedRouteCount : Number(evidence?.verifiedRouteCount) || 0,
    status: valid ? 'complete' : 'not-complete',
    auditId: typeof evidence?.auditId === 'string' ? evidence.auditId : null,
    verifiedAt: typeof evidence?.verifiedAt === 'string' ? evidence.verifiedAt : null,
    note: valid
      ? 'Current-run Browser evidence verifies every route at a stable settled state with a screenshot and no loading, route error, or horizontal overflow.'
      : 'This matrix validates route/action/browser-file contracts only. Product Design completion still requires current-run Browser screenshots and step notes.'
  };
}

export function buildProductDesignValidationMatrix(rootDir = process.cwd(), options = {}) {
  const appRoot = path.join(rootDir, 'app');
  const pageFiles = walkFiles(appRoot)
    .filter(filePath => pageEntryNames.has(path.basename(filePath)))
    .sort();

  const routes = pageFiles.map(pageFile => {
    const routePath = routePathFromPageFile(appRoot, pageFile);
    const testFile = findAdjacentPageTest(path.dirname(pageFile));
    return {
      routePath,
      pageFile: normalizeRelative(rootDir, pageFile),
      routeTestFile: testFile ? normalizeRelative(rootDir, testFile) : null,
      hasRouteTest: testFile != null
    };
  });

  const workflowEvidence = workflowFamilies.map(family => {
    const routesInFamily = routes.filter(route =>
      family.routePrefixes.some(prefix => route.routePath === prefix || route.routePath.startsWith(`${prefix}/`))
    );
    const browserEvidenceFiles = findBrowserEvidenceFiles(rootDir, family.browserEvidencePatterns);
    return {
      key: family.key,
      label: family.label,
      routeCount: routesInFamily.length,
      routes: routesInFamily.map(route => route.routePath).sort(),
      browserEvidenceFiles,
      browserEvidenceKind: 'file-contract',
      hasBrowserEvidence: browserEvidenceFiles.length > 0
    };
  });

  const actionEvidence = noviceActionExpectations.map(family => ({
    key: family.key,
    actions: family.actions.map(action => {
      const evidenceFiles = findActionEvidenceFiles(rootDir, action.filePatterns);
      const hasContentEvidence = actionEvidenceMatchesContent(rootDir, evidenceFiles, action.contentPatterns);
      return {
        key: action.key,
        label: action.label,
        evidenceFiles,
        hasContentEvidence,
        hasEvidence: evidenceFiles.length > 0 && hasContentEvidence
      };
    })
  }));

  const categorizedRoutes = new Set(workflowEvidence.flatMap(family => family.routes));
  const uncategorizedRoutes = routes.filter(route => !categorizedRoutes.has(route.routePath));
  const missingRouteTests = routes.filter(route => !route.hasRouteTest);
  const missingBrowserEvidence = workflowEvidence.filter(family => family.routeCount > 0 && !family.hasBrowserEvidence);
  const missingActionEvidence = actionEvidence.flatMap(family =>
    family.actions
      .filter(action => !action.hasEvidence)
      .map(action => ({ family: family.key, action: action.key, label: action.label }))
  );
  const contractValid = missingRouteTests.length === 0
    && missingBrowserEvidence.length === 0
    && uncategorizedRoutes.length === 0
    && missingActionEvidence.length === 0;
  const freshBrowserScreenshotAudit = evaluateFreshBrowserScreenshotAudit(
    routes.map(route => route.routePath),
    readFreshBrowserAuditEvidence(rootDir, options.freshBrowserAudit)
  );

  return {
    generatedFor: 'product-design-user-validation-loop',
    routeCount: routes.length,
    categorizedRouteCount: categorizedRoutes.size,
    routes,
    workflowEvidence,
    actionEvidence,
    uncategorizedRoutes,
    missingRouteTests,
    missingBrowserEvidence,
    missingActionEvidence,
    contractValid,
    freshBrowserScreenshotAudit,
    goalComplete: contractValid && freshBrowserScreenshotAudit.valid,
    valid: contractValid
  };
}

export function formatProductDesignValidationMatrix(matrix) {
  const lines = [
    `Product Design validation matrix: ${matrix.routeCount} routes`,
    `Route tests: ${matrix.routeCount - matrix.missingRouteTests.length}/${matrix.routeCount}`,
    `Workflow route coverage: ${matrix.categorizedRouteCount}/${matrix.routeCount}`,
    `Workflow browser evidence files: ${matrix.workflowEvidence.filter(item => item.hasBrowserEvidence).length}/${matrix.workflowEvidence.length}`,
    `Contract coverage: ${matrix.contractValid ? 'valid' : 'incomplete'}`,
    `Fresh Browser screenshot audit: ${matrix.freshBrowserScreenshotAudit.verifiedRouteCount}/${matrix.freshBrowserScreenshotAudit.routeCount} current-run routes verified [${matrix.freshBrowserScreenshotAudit.status}]`,
    `Goal completion proof: ${matrix.goalComplete ? 'complete' : 'incomplete'}`,
    `Novice action evidence: ${matrix.actionEvidence.reduce((sum, family) => sum + family.actions.filter(action => action.hasEvidence).length, 0)}/${matrix.actionEvidence.reduce((sum, family) => sum + family.actions.length, 0)}`
  ];

  for (const family of matrix.workflowEvidence) {
    const actionFamily = matrix.actionEvidence.find(item => item.key === family.key);
    const actionCount = actionFamily ? actionFamily.actions.filter(action => action.hasEvidence).length : 0;
    const totalActionCount = actionFamily ? actionFamily.actions.length : 0;
    lines.push(
      `- ${family.key}: ${family.routeCount} routes, ${family.browserEvidenceFiles.length} browser evidence file(s) [${family.browserEvidenceKind}], ${actionCount}/${totalActionCount} action evidence item(s)`
    );
  }

  if (matrix.missingRouteTests.length > 0) {
    lines.push('Missing route tests:');
    matrix.missingRouteTests.forEach(route => lines.push(`- ${route.routePath} (${route.pageFile})`));
  }

  if (matrix.uncategorizedRoutes.length > 0) {
    lines.push('Uncategorized routes:');
    matrix.uncategorizedRoutes.forEach(route => lines.push(`- ${route.routePath} (${route.pageFile})`));
  }

  if (matrix.missingBrowserEvidence.length > 0) {
    lines.push('Missing workflow browser evidence files:');
    matrix.missingBrowserEvidence.forEach(family => lines.push(`- ${family.key}`));
  }

  if (matrix.missingActionEvidence.length > 0) {
    lines.push('Missing novice action evidence:');
    matrix.missingActionEvidence.forEach(item => lines.push(`- ${item.family}/${item.action}: ${item.label}`));
  }

  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const matrix = buildProductDesignValidationMatrix();
  console.log(formatProductDesignValidationMatrix(matrix));
  if (!matrix.valid) {
    process.exitCode = 1;
  }
}
