type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type ExplorerSignalKey = 'trace' | 'log' | 'metric';
export type ExplorerSignalTone = 'trace' | 'log' | 'metric' | 'default';

export type ExplorerResultRow = {
  key: string;
  signalKey: ExplorerSignalKey;
  signalTone: ExplorerSignalTone;
  href: string;
  signal: string;
  service: string;
  operation: string;
  status: string;
  duration: string;
  timestamp: string;
};

export type ExplorerFilterGroup = {
  title: string;
  values: string[];
};

export function explorerSignalTone(signalKey: ExplorerSignalKey): ExplorerSignalTone {
  if (signalKey === 'trace') return 'trace';
  if (signalKey === 'log') return 'log';
  if (signalKey === 'metric') return 'metric';
  return 'default';
}

export function buildExplorerSurfaceConfig(t: Translator) {
  return {
    title: t('explorer.title'),
    subtitle: t('explorer.subtitle'),
    tags: [t('explorer.tags.unified-query'), t('explorer.tags.context-retention'), t('explorer.tags.cross-signal-search')],
    focus: t('explorer.focus'),
    summary: t('explorer.summary'),
    lanes: [
      { title: t('explorer.lanes.query.title'), copy: t('explorer.lanes.query.copy'), meta: t('explorer.lanes.query.meta') },
      { title: t('explorer.lanes.results.title'), copy: t('explorer.lanes.results.copy'), meta: t('explorer.lanes.results.meta') },
      { title: t('explorer.lanes.drilldown.title'), copy: t('explorer.lanes.drilldown.copy'), meta: t('explorer.lanes.drilldown.meta') }
    ],
    checklist: [
      { title: t('explorer.checklist.entry.title'), copy: t('explorer.checklist.entry.copy'), meta: t('explorer.checklist.entry.meta') },
      { title: t('explorer.checklist.adapters.title'), copy: t('explorer.checklist.adapters.copy'), meta: t('explorer.checklist.adapters.meta') },
      { title: t('explorer.checklist.links.title'), copy: t('explorer.checklist.links.copy'), meta: t('explorer.checklist.links.meta') }
    ],
    actions: [
      { label: t('menu.dashboard.back'), href: '/overview', variant: 'subtle' as const },
      { label: t('menu.log.manage'), href: '/log/manage', variant: 'default' as const },
      { label: t('menu.trace.manage'), href: '/trace/manage', variant: 'primary' as const }
    ]
  };
}

export function buildExplorerResultRows(t: Translator): ExplorerResultRow[] {
  return [
    {
      key: 'trace-checkout',
      signalKey: 'trace',
      signalTone: explorerSignalTone('trace'),
      href: '/trace/manage?serviceName=checkout',
      signal: t('explorer.rows.trace.signal'),
      service: 'checkout',
      operation: 'POST /checkout',
      status: t('explorer.status.error'),
      duration: '1.25s',
      timestamp: '2026-03-30 11:50:57'
    },
    {
      key: 'log-payment',
      signalKey: 'log',
      signalTone: explorerSignalTone('log'),
      href: '/log/manage?search=payment',
      signal: t('explorer.rows.log.signal'),
      service: 'payment',
      operation: t('explorer.rows.log.operation'),
      status: t('explorer.status.error'),
      duration: '-',
      timestamp: '2026-03-30 11:50:57'
    },
    {
      key: 'metric-frontend',
      signalKey: 'metric',
      signalTone: explorerSignalTone('metric'),
      href: '/ingestion/otlp/metrics?serviceName=frontend',
      signal: t('explorer.rows.metric.signal'),
      service: 'frontend',
      operation: 'http.server.duration',
      status: t('explorer.status.normal'),
      duration: '0.88ms',
      timestamp: '2026-03-30 11:50:58'
    }
  ];
}

export function buildExplorerFilters(t: Translator): ExplorerFilterGroup[] {
  return [
    {
      title: t('explorer.filters.signal-type'),
      values: [t('explorer.rows.trace.signal'), t('explorer.rows.log.signal'), t('explorer.rows.metric.signal'), t('explorer.rows.exception.signal')]
    },
    { title: t('explorer.filters.deployment-environment'), values: ['demo', 'prod'] },
    { title: t('explorer.filters.service-name'), values: ['checkout', 'frontend', 'payment', 'cart'] },
    { title: t('explorer.filters.status'), values: [t('explorer.status.error'), t('explorer.status.normal')] }
  ];
}
