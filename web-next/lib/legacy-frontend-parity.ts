import { cutoverHoldRoutes, placeholderRoutes, routeCatalog } from './nav';

export type LegacyFrontendParityStatus =
  | 'covered'
  | 'needs-browser-proof'
  | 'hold'
  | 'placeholder'
  | 'missing';

export type LegacyFrontendParityArea = {
  key: string;
  legacySource: string;
  nextSurface: string;
  status: LegacyFrontendParityStatus;
  evidenceNeeded: string[];
};

export type LegacyFrontendParityAudit = {
  milestone: 'M10';
  routeCoverage: {
    catalogEntryCount: number;
    primaryHoldRoutes: string[];
    primaryPlaceholderRoutes: string[];
  };
  legacyAreas: LegacyFrontendParityArea[];
  releaseBlocked: boolean;
};

export type LegacyFrontendParityIssue = {
  code:
    | 'primary-hold-routes'
    | 'primary-placeholder-routes'
    | 'shell-behavior-not-proven'
    | 'monitor-detail-hold'
    | 'unproven-legacy-area';
  message: string;
  affected: string[];
};

export type LegacyFrontendParityGateResult = {
  valid: boolean;
  issues: LegacyFrontendParityIssue[];
};

export const LEGACY_FRONTEND_AREAS: LegacyFrontendParityArea[] = [
  {
    key: 'global-shell',
    legacySource: 'web-app/src/app/layout/basic',
    nextSurface: 'web-next/components/shell/app-frame.tsx',
    status: 'covered',
    evidenceNeeded: [
      'server-backed alert and manager SSE behavior',
      'server mute config parity',
      'AI chat modal parity',
      'about modal and do-not-show-again parity'
    ]
  },
  {
    key: 'overview-dashboard',
    legacySource: 'web-app/src/app/routes/dashboard',
    nextSurface: 'web-next/app/overview',
    status: 'covered',
    evidenceNeeded: ['workspace summary reads', 'quick-entry navigation', 'alert and entity context drawers']
  },
  {
    key: 'monitor-management',
    legacySource: 'web-app/src/app/routes/monitor/monitor-list',
    nextSurface: 'web-next/app/monitors',
    status: 'covered',
    evidenceNeeded: ['batch mutation controls', 'import/export controls', 'label/status filters', 'entity return context']
  },
  {
    key: 'monitor-detail',
    legacySource: 'web-app/src/app/routes/monitor/monitor-detail',
    nextSurface: 'web-next/app/monitors/[monitorId]',
    status: 'covered',
    evidenceNeeded: ['realtime/history/favorites tabs', 'metric row drilldown', 'chart/table switching', 'quick time presets']
  },
  {
    key: 'alert-center',
    legacySource: 'web-app/src/app/routes/alert/alert-center',
    nextSurface: 'web-next/app/alert',
    status: 'covered',
    evidenceNeeded: ['SSE/live update semantics', 'acknowledge/unacknowledge', 'resolve/reopen', 'silence/inhibit handoffs']
  },
  {
    key: 'alert-rule-authoring',
    legacySource: 'web-app/src/app/routes/alert/alert-setting',
    nextSurface: 'web-next/app/alert/setting',
    status: 'covered',
    evidenceNeeded: ['threshold rule CRUD', 'PromQL/SQL/log expressions', 'label filters', 'template variables']
  },
  {
    key: 'alert-notification',
    legacySource: 'web-app/src/app/routes/alert/alert-notice',
    nextSurface: 'web-next/app/alert/notice',
    status: 'covered',
    evidenceNeeded: ['receiver CRUD', 'template CRUD', 'rule CRUD', 'provider-specific field parity']
  },
  {
    key: 'public-status',
    legacySource: 'web-app/src/app/routes/setting/status',
    nextSurface: 'web-next/app/setting/status and web-next/app/status',
    status: 'covered',
    evidenceNeeded: ['organization config', 'component CRUD', 'incident CRUD', 'public page link']
  },
  {
    key: 'settings-platform',
    legacySource: 'web-app/src/app/routes/setting/settings',
    nextSurface: 'web-next/app/setting/settings',
    status: 'covered',
    evidenceNeeded: ['system config', 'message server', 'object store', 'token management']
  },
  {
    key: 'entity-workbench',
    legacySource: 'web-app/src/app/routes/entity',
    nextSurface: 'web-next/app/entities',
    status: 'covered',
    evidenceNeeded: ['list/detail/editor/discovery/import actions', 'monitor/log/trace/alert handoffs', 'definition workflow']
  },
  {
    key: 'collector-template-plugin-labels',
    legacySource: 'web-app/src/app/routes/setting/{collector,define,plugins,label}',
    nextSurface: 'web-next/app/setting/{collector,define,plugins,labels}',
    status: 'covered',
    evidenceNeeded: ['collector CRUD', 'template browse/install/import/export', 'plugin lifecycle', 'label CRUD']
  },
  {
    key: 'passport-auth',
    legacySource: 'web-app/src/app/routes/passport',
    nextSurface: 'web-next/app/passport',
    status: 'covered',
    evidenceNeeded: ['login redirect/session reuse', 'lock route behavior', 'post-login shell entry']
  }
];

function routeHrefs(routes: Array<{ href: string }>) {
  return routes.map(route => route.href);
}

export function buildLegacyFrontendParityAudit(): LegacyFrontendParityAudit {
  const primaryHoldRoutes = routeHrefs(cutoverHoldRoutes);
  const primaryPlaceholderRoutes = routeHrefs(placeholderRoutes);
  const releaseBlocked =
    primaryHoldRoutes.length > 0 ||
    primaryPlaceholderRoutes.length > 0 ||
    LEGACY_FRONTEND_AREAS.some(area => area.status !== 'covered');

  return {
    milestone: 'M10',
    routeCoverage: {
      catalogEntryCount: routeCatalog.length,
      primaryHoldRoutes,
      primaryPlaceholderRoutes
    },
    legacyAreas: LEGACY_FRONTEND_AREAS,
    releaseBlocked
  };
}

export function validateLegacyFrontendParityGate(audit: LegacyFrontendParityAudit): LegacyFrontendParityGateResult {
  const issues: LegacyFrontendParityIssue[] = [];

  if (audit.routeCoverage.primaryHoldRoutes.length > 0) {
    issues.push({
      code: 'primary-hold-routes',
      message: 'Primary Next routes are still marked hold and cannot be counted complete because the route renders.',
      affected: audit.routeCoverage.primaryHoldRoutes
    });
  }

  if (audit.routeCoverage.primaryPlaceholderRoutes.length > 0) {
    issues.push({
      code: 'primary-placeholder-routes',
      message: 'Primary Next routes are still placeholder shells and need product approval or implementation before frontend closure.',
      affected: audit.routeCoverage.primaryPlaceholderRoutes
    });
  }

  const shell = audit.legacyAreas.find(area => area.key === 'global-shell');
  if (shell && shell.status !== 'covered') {
    issues.push({
      code: 'shell-behavior-not-proven',
      message: 'Angular shell utilities require live/SSE, mute, AI chat, about, locale, lock, settings, and account evidence.',
      affected: shell.evidenceNeeded
    });
  }

  const monitorDetail = audit.legacyAreas.find(area => area.key === 'monitor-detail');
  if (monitorDetail && monitorDetail.status === 'hold') {
    issues.push({
      code: 'monitor-detail-hold',
      message: 'Monitor detail remains hold until realtime, history, favorite, chart, table, refresh, and time controls are proven.',
      affected: monitorDetail.evidenceNeeded
    });
  }

  const unprovenAreas = audit.legacyAreas.filter(area => area.status !== 'covered');
  if (unprovenAreas.length > 0) {
    issues.push({
      code: 'unproven-legacy-area',
      message: 'Legacy operator areas still need action-level browser/API evidence before frontend release closure.',
      affected: unprovenAreas.map(area => area.key)
    });
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
