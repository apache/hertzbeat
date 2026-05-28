export type NavItem = {
  key: string;
  labelKey: string;
  label: string;
  href: string;
  icon: string;
};

export type NavSection = {
  key: string;
  titleKey: string;
  title: string;
  items: NavItem[];
};

export type CutoverStatus = 'candidate' | 'hold' | 'placeholder';
export type RouteKind = 'primary' | 'legacy-alias';

export type RouteCatalogEntry = {
  key: string;
  href: string;
  labelKey: string;
  label: string;
  icon?: string;
  navSectionKey?: string;
  includeInNavigation?: boolean;
  routeKind: RouteKind;
  cutoverStatus: CutoverStatus;
  smokePath?: string;
  includeInRouteMatrix?: boolean;
  redirectTo?: string;
  legacyAliases?: string[];
};

type NavSectionSeed = Omit<NavSection, 'items'>;

const navSectionSeeds: NavSectionSeed[] = [
  { key: 'ingestion', titleKey: 'menu.section.ingestion', title: 'Ingestion & collection' },
  { key: 'objects', titleKey: 'menu.section.objects', title: 'Objects & resources' },
  { key: 'observability', titleKey: 'menu.section.observability', title: 'Observability troubleshooting' },
  { key: 'alerting', titleKey: 'menu.section.alerting', title: 'Alerts & remediation' },
  { key: 'dashboards', titleKey: 'menu.section.dashboards', title: 'Dashboards' },
  { key: 'settings', titleKey: 'menu.section.settings', title: 'Platform settings' }
];

export const routeCatalog: RouteCatalogEntry[] = [
  {
    key: 'overview-home',
    labelKey: 'menu.overview',
    label: 'Dashboard',
    href: '/overview',
    icon: 'overview',
    navSectionKey: 'dashboards',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/overview',
    includeInRouteMatrix: true,
    legacyAliases: ['/']
  },
  {
    key: 'entities',
    labelKey: 'menu.entity.center',
    label: 'Entity catalog',
    href: '/entities',
    icon: 'entities',
    navSectionKey: 'objects',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/entities',
    includeInRouteMatrix: true
  },
  {
    key: 'entities-discovery',
    labelKey: 'menu.entity.discovery',
    label: 'Discovery',
    href: '/entities/discovery',
    icon: 'entity-discovery',
    navSectionKey: 'objects',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/entities/discovery',
    includeInRouteMatrix: false
  },
  {
    key: 'entities-definition',
    labelKey: 'menu.entity.definition',
    label: 'Definitions',
    href: '/entities/import',
    icon: 'entity-definition',
    navSectionKey: 'objects',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/entities/import',
    includeInRouteMatrix: false
  },
  {
    key: 'entities-new',
    labelKey: 'entity.new',
    label: 'New entity',
    href: '/entities/new',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/entities/new',
    includeInRouteMatrix: true
  },
  {
    key: 'entities-detail',
    labelKey: 'entity.detail',
    label: 'Entity detail',
    href: '/entities/[entityId]',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/entities/1',
    includeInRouteMatrix: true
  },
  {
    key: 'entities-edit',
    labelKey: 'entity.edit',
    label: 'Edit entity',
    href: '/entities/[entityId]/edit',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/entities/1/edit',
    includeInRouteMatrix: true
  },
  {
    key: 'entities-definition-detail',
    labelKey: 'entity.definition.workspace.edit-title',
    label: 'Entity definition',
    href: '/entities/[entityId]/definition',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/entities/1/definition',
    includeInRouteMatrix: true
  },
  {
    key: 'alert-center',
    labelKey: 'menu.alert.center',
    label: 'Alert center',
    href: '/alert',
    icon: 'alert',
    navSectionKey: 'alerting',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/alert',
    includeInRouteMatrix: true,
    legacyAliases: ['/alert/center', '/alerts']
  },
  {
    key: 'alert-threshold',
    labelKey: 'menu.alert.setting',
    label: 'Threshold rules',
    href: '/alert/setting',
    icon: 'alert-setting',
    navSectionKey: 'alerting',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/alert/setting',
    includeInRouteMatrix: true
  },
  {
    key: 'alert-integration',
    labelKey: 'menu.alert.integration',
    label: 'Integrations',
    href: '/alert/integration/[source]',
    icon: 'alert-integration',
    navSectionKey: 'alerting',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/alert/integration/webhook',
    includeInRouteMatrix: true
  },
  {
    key: 'alert-group',
    labelKey: 'menu.alert.group',
    label: 'Grouping',
    href: '/alert/group',
    icon: 'alert-group',
    navSectionKey: 'alerting',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/alert/group',
    includeInRouteMatrix: true
  },
  {
    key: 'alert-inhibit',
    labelKey: 'menu.alert.inhibit',
    label: 'Inhibit rules',
    href: '/alert/inhibit',
    icon: 'alert-inhibit',
    navSectionKey: 'alerting',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/alert/inhibit',
    includeInRouteMatrix: true
  },
  {
    key: 'alert-silence',
    labelKey: 'menu.alert.silence',
    label: 'Silence rules',
    href: '/alert/silence',
    icon: 'alert-silence',
    navSectionKey: 'alerting',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/alert/silence',
    includeInRouteMatrix: true
  },
  {
    key: 'incidents',
    labelKey: 'menu.incidents',
    label: 'Incidents',
    href: '/incidents',
    icon: 'incidents',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/incidents',
    includeInRouteMatrix: false
  },
  {
    key: 'actions',
    labelKey: 'menu.actions',
    label: 'Automation',
    href: '/actions',
    icon: 'actions',
    routeKind: 'primary',
    cutoverStatus: 'placeholder',
    smokePath: '/actions',
    includeInRouteMatrix: false
  },
  {
    key: 'alert-notice',
    labelKey: 'menu.alert.dispatch',
    label: 'Notifications',
    href: '/alert/notice',
    icon: 'alert-notice',
    navSectionKey: 'alerting',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/alert/notice',
    includeInRouteMatrix: true
  },
  {
    key: 'dashboard',
    labelKey: 'menu.overview',
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'overview',
    routeKind: 'legacy-alias',
    cutoverStatus: 'candidate',
    smokePath: '/dashboard',
    includeInRouteMatrix: true,
    redirectTo: '/overview'
  },
  {
    key: 'otlp',
    labelKey: 'menu.ingestion.center',
    label: 'OTLP intake',
    href: '/ingestion/otlp',
    icon: 'otlp',
    navSectionKey: 'ingestion',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/ingestion/otlp',
    includeInRouteMatrix: true
  },
  {
    key: 'otlp-metrics',
    labelKey: 'menu.ingestion.metrics',
    label: 'OTLP metrics',
    href: '/ingestion/otlp/metrics',
    icon: 'otlp-metrics',
    navSectionKey: 'observability',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/ingestion/otlp/metrics',
    includeInRouteMatrix: true
  },
  {
    key: 'logs',
    labelKey: 'menu.log.manage',
    label: 'Log workspace',
    href: '/log/manage',
    icon: 'log',
    navSectionKey: 'observability',
    routeKind: 'primary',
    cutoverStatus: 'hold',
    smokePath: '/log/manage',
    includeInRouteMatrix: true,
    legacyAliases: ['/events', '/log/stream', '/log/integration', '/log/integration/[source]']
  },
  {
    key: 'traces',
    labelKey: 'menu.trace.manage',
    label: 'Trace workspace',
    href: '/trace/manage',
    icon: 'trace',
    navSectionKey: 'observability',
    routeKind: 'primary',
    cutoverStatus: 'hold',
    smokePath: '/trace/manage',
    includeInRouteMatrix: true
  },
  {
    key: 'topology',
    labelKey: 'menu.topology',
    label: 'Topology',
    href: '/topology',
    icon: 'topology',
    navSectionKey: 'observability',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/topology',
    includeInRouteMatrix: true
  },
  {
    key: 'explorer',
    labelKey: 'menu.exceptions',
    label: 'Explorer',
    href: '/explorer',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/explorer',
    includeInRouteMatrix: false
  },
  {
    key: 'exceptions',
    labelKey: 'menu.exceptions',
    label: 'Exceptions',
    href: '/exception/[type]',
    icon: 'explorer',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/exception/404',
    includeInRouteMatrix: true
  },
  {
    key: 'monitoring-center',
    labelKey: 'menu.monitor.center',
    label: 'Monitoring center',
    href: '/monitors',
    icon: 'monitor',
    navSectionKey: 'ingestion',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/monitors',
    includeInRouteMatrix: true
  },
  {
    key: 'monitoring-detail',
    labelKey: 'monitor.detail',
    label: 'Monitor detail',
    href: '/monitors/[monitorId]',
    routeKind: 'primary',
    cutoverStatus: 'hold',
    smokePath: '/monitors/1',
    includeInRouteMatrix: true
  },
  {
    key: 'monitoring-new',
    labelKey: 'monitor.new',
    label: 'New monitor',
    href: '/monitors/new',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/monitors/new',
    includeInRouteMatrix: true
  },
  {
    key: 'monitoring-edit',
    labelKey: 'monitor.edit',
    label: 'Edit monitor',
    href: '/monitors/[monitorId]/edit',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/monitors/1/edit',
    includeInRouteMatrix: true
  },
  {
    key: 'collector',
    labelKey: 'menu.monitor.collector',
    label: 'Collector',
    href: '/setting/collector',
    icon: 'collector',
    navSectionKey: 'ingestion',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/setting/collector',
    includeInRouteMatrix: true
  },
  {
    key: 'define',
    labelKey: 'menu.monitor.template',
    label: 'Definitions',
    href: '/setting/define',
    icon: 'monitor-template',
    navSectionKey: 'ingestion',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/setting/define',
    includeInRouteMatrix: true
  },
  {
    key: 'bulletin',
    labelKey: 'menu.monitor.bulletin',
    label: 'Bulletin',
    href: '/bulletin',
    icon: 'alert-bulletin',
    navSectionKey: 'alerting',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/bulletin',
    includeInRouteMatrix: true
  },
  {
    key: 'settings-root',
    labelKey: 'menu.settings',
    label: 'System settings',
    href: '/setting/settings',
    icon: 'settings',
    navSectionKey: 'settings',
    includeInNavigation: true,
    routeKind: 'legacy-alias',
    cutoverStatus: 'candidate',
    smokePath: '/setting/settings',
    includeInRouteMatrix: true,
    redirectTo: '/setting/settings/config'
  },
  {
    key: 'settings-mcp-server',
    labelKey: 'menu.advanced.mcp-server',
    label: 'MCP Server',
    href: '/setting/settings/mcp-server',
    icon: 'mcp-server',
    navSectionKey: 'settings',
    includeInNavigation: true,
    routeKind: 'legacy-alias',
    cutoverStatus: 'candidate',
    smokePath: '/setting/settings/mcp-server',
    includeInRouteMatrix: false,
    redirectTo: '/setting/settings/config'
  },
  {
    key: 'settings-config',
    labelKey: 'menu.settings',
    label: 'System settings',
    href: '/setting/settings/config',
    icon: 'settings',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/setting/settings/config',
    includeInRouteMatrix: true
  },
  {
    key: 'settings-status',
    labelKey: 'menu.advanced.status',
    label: 'Status page',
    href: '/setting/status',
    icon: 'status',
    navSectionKey: 'settings',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/setting/status',
    includeInRouteMatrix: true
  },
  {
    key: 'settings-labels',
    labelKey: 'menu.advanced.labels',
    label: 'Labels',
    href: '/setting/labels',
    icon: 'token',
    navSectionKey: 'settings',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/setting/labels',
    includeInRouteMatrix: true
  },
  {
    key: 'settings-plugins',
    labelKey: 'menu.advanced.plugins',
    label: 'Plugins',
    href: '/setting/plugins',
    icon: 'plugins',
    navSectionKey: 'settings',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/setting/plugins',
    includeInRouteMatrix: true
  },
  {
    key: 'help-center',
    labelKey: 'menu.extras.help',
    label: 'Help center',
    href: 'https://hertzbeat.apache.org/docs/',
    icon: 'help',
    navSectionKey: 'settings',
    includeInNavigation: true,
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: 'https://hertzbeat.apache.org/docs/',
    includeInRouteMatrix: false
  },
  {
    key: 'settings-server',
    labelKey: 'settings.server',
    label: 'Message server',
    href: '/setting/settings/server',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/setting/settings/server',
    includeInRouteMatrix: true
  },
  {
    key: 'settings-object-store',
    labelKey: 'settings.object-store',
    label: 'Object store',
    href: '/setting/settings/object-store',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/setting/settings/object-store',
    includeInRouteMatrix: true
  },
  {
    key: 'settings-token',
    labelKey: 'settings.token',
    label: 'Token management',
    href: '/setting/settings/token',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/setting/settings/token',
    includeInRouteMatrix: true
  },
  {
    key: 'status-public',
    labelKey: 'menu.advanced.status',
    label: 'Public status',
    href: '/status',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/status',
    includeInRouteMatrix: true,
    legacyAliases: ['/status/public']
  },
  {
    key: 'passport-login',
    labelKey: 'app.login.login',
    label: 'Login',
    href: '/passport/login',
    routeKind: 'primary',
    cutoverStatus: 'hold',
    smokePath: '/passport/login',
    includeInRouteMatrix: true,
    legacyAliases: ['/login']
  },
  {
    key: 'passport-lock',
    labelKey: 'app.lock',
    label: 'Lock',
    href: '/passport/lock',
    routeKind: 'primary',
    cutoverStatus: 'candidate',
    smokePath: '/passport/lock',
    includeInRouteMatrix: true
  },
  {
    key: 'root-alias',
    labelKey: 'menu.home',
    label: 'Home alias',
    href: '/',
    routeKind: 'legacy-alias',
    cutoverStatus: 'candidate',
    smokePath: '/',
    includeInRouteMatrix: true,
    redirectTo: '/overview'
  },
  {
    key: 'login-alias',
    labelKey: 'app.login.login',
    label: 'Passport login alias',
    href: '/login',
    routeKind: 'legacy-alias',
    cutoverStatus: 'hold',
    smokePath: '/login',
    includeInRouteMatrix: true,
    redirectTo: '/passport/login'
  },
  {
    key: 'setting-alias',
    labelKey: 'menu.settings',
    label: 'Settings alias',
    href: '/setting',
    routeKind: 'legacy-alias',
    cutoverStatus: 'candidate',
    smokePath: '/setting',
    includeInRouteMatrix: true,
    redirectTo: '/setting/settings/config'
  },
  {
    key: 'alerts-alias',
    labelKey: 'menu.alert.center',
    label: 'Alert center alias',
    href: '/alerts',
    routeKind: 'legacy-alias',
    cutoverStatus: 'candidate',
    smokePath: '/alerts',
    includeInRouteMatrix: true,
    redirectTo: '/alert'
  },
  {
    key: 'events-alias',
    labelKey: 'menu.log.manage',
    label: 'Events log alias',
    href: '/events',
    routeKind: 'legacy-alias',
    cutoverStatus: 'hold',
    smokePath: '/events',
    includeInRouteMatrix: true,
    redirectTo: '/log/manage'
  },
  {
    key: 'alert-center-alias',
    labelKey: 'menu.alert.center',
    label: 'Alert center alias',
    href: '/alert/center',
    routeKind: 'legacy-alias',
    cutoverStatus: 'candidate',
    smokePath: '/alert/center',
    includeInRouteMatrix: true,
    redirectTo: '/alert'
  },
  {
    key: 'log-stream-alias',
    labelKey: 'menu.log.manage',
    label: 'Log stream alias',
    href: '/log/stream',
    routeKind: 'legacy-alias',
    cutoverStatus: 'hold',
    smokePath: '/log/stream',
    includeInRouteMatrix: true,
    redirectTo: '/log/manage?view=stream'
  },
  {
    key: 'log-integration-alias',
    labelKey: 'menu.log.manage',
    label: 'Log integration alias',
    href: '/log/integration',
    routeKind: 'legacy-alias',
    cutoverStatus: 'hold',
    smokePath: '/log/integration',
    includeInRouteMatrix: true,
    redirectTo: '/log/manage'
  },
  {
    key: 'log-integration-source-alias',
    labelKey: 'menu.log.manage',
    label: 'Log integration source alias',
    href: '/log/integration/[source]',
    routeKind: 'legacy-alias',
    cutoverStatus: 'hold',
    smokePath: '/log/integration/webhook',
    includeInRouteMatrix: true,
    redirectTo: '/log/manage'
  },
  {
    key: 'status-public-alias',
    labelKey: 'menu.advanced.status',
    label: 'Public status alias',
    href: '/status/public',
    routeKind: 'legacy-alias',
    cutoverStatus: 'candidate',
    smokePath: '/status/public',
    includeInRouteMatrix: true,
    redirectTo: '/status'
  }
];

export const navSections: NavSection[] = navSectionSeeds.map(section => ({
  ...section,
  items: routeCatalog
    .filter(route => route.navSectionKey === section.key && route.icon && (route.routeKind === 'primary' || route.includeInNavigation))
    .map(route => ({
      key: route.key,
      labelKey: route.labelKey,
      label: route.label,
      href: route.href.includes('[') ? route.href.replace('/[source]', '/webhook').replace('/[type]', '/404') : route.href,
      icon: route.icon || 'overview'
    }))
}));

export const legacyRouteAliases = routeCatalog.filter(route => route.routeKind === 'legacy-alias');

export const cutoverCandidateRoutes = routeCatalog.filter(route => route.cutoverStatus === 'candidate' && route.routeKind === 'primary');
export const cutoverHoldRoutes = routeCatalog.filter(route => route.cutoverStatus === 'hold' && route.routeKind === 'primary');
export const placeholderRoutes = routeCatalog.filter(route => route.cutoverStatus === 'placeholder' && route.routeKind === 'primary');

export const routeMatrixPaths = routeCatalog
  .filter(route => route.includeInRouteMatrix)
  .map(route => route.smokePath || route.href);
