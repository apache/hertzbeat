type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type ExplorerResultRow = {
  key: string;
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

export function buildExplorerSurfaceConfig(t: Translator) {
  return {
    title: '查询工作台',
    subtitle: t('explorer.subtitle'),
    tags: ['统一查询', '上下文保留', '跨信号检索'],
    focus: t('explorer.focus'),
    summary: t('explorer.summary'),
    lanes: [
      { title: t('explorer.lanes.query.title'), copy: t('explorer.lanes.query.copy'), meta: '查询栏契约' },
      { title: t('explorer.lanes.results.title'), copy: t('explorer.lanes.results.copy'), meta: '结果面板' },
      { title: t('explorer.lanes.drilldown.title'), copy: t('explorer.lanes.drilldown.copy'), meta: '上下文跳转' }
    ],
    checklist: [
      { title: t('explorer.checklist.entry.title'), copy: t('explorer.checklist.entry.copy'), meta: 'done' },
      { title: t('explorer.checklist.adapters.title'), copy: t('explorer.checklist.adapters.copy'), meta: 'next' },
      { title: t('explorer.checklist.links.title'), copy: t('explorer.checklist.links.copy'), meta: 'reserved' }
    ],
    actions: [
      { label: t('menu.dashboard.back'), href: '/overview', variant: 'subtle' as const },
      { label: t('menu.log.manage'), href: '/log/manage', variant: 'default' as const },
      { label: t('menu.trace.manage'), href: '/trace/manage', variant: 'primary' as const }
    ]
  };
}

export function buildExplorerResultRows(): ExplorerResultRow[] {
  return [
    {
      key: 'trace-checkout',
      signal: '链路',
      service: 'checkout',
      operation: 'POST /checkout',
      status: '错误',
      duration: '1.25s',
      timestamp: '2026-03-30 11:50:57'
    },
    {
      key: 'log-payment',
      signal: '日志',
      service: 'payment',
      operation: '支付失败：余额不足',
      status: '错误',
      duration: '-',
      timestamp: '2026-03-30 11:50:57'
    },
    {
      key: 'metric-frontend',
      signal: '指标',
      service: 'frontend',
      operation: 'http.server.duration',
      status: '正常',
      duration: '0.88ms',
      timestamp: '2026-03-30 11:50:58'
    }
  ];
}

export function buildExplorerFilters(): ExplorerFilterGroup[] {
  return [
    { title: '信号类型', values: ['链路', '日志', '指标', '异常'] },
    { title: '部署环境', values: ['demo', 'prod'] },
    { title: '服务名称', values: ['checkout', 'frontend', 'payment', 'cart'] },
    { title: '状态', values: ['错误', '正常'] }
  ];
}
