type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type ExceptionRouteType = '403' | '404' | '500';

type ExceptionCopy = {
  title: string;
  subtitle: string;
  tone?: 'default' | 'danger';
  facts: Array<{ label: string; value: string }>;
  rows: Array<{ title: string; copy: string; meta?: string }>;
};

export type ExceptionExplorerRow = {
  key: string;
  href: string;
  exceptionType: string;
  errorMessage: string;
  count: string;
  lastSeen: string;
  firstSeen: string;
  application: string;
};

export type ExceptionFilterGroup = {
  title: string;
  values: string[];
};

export type ExceptionRecoveryRow = {
  title: string;
  copy: string;
  href: string;
  label: string;
};

type ExceptionExplorerRowBase = Omit<ExceptionExplorerRow, 'href'>;

export function normalizeExceptionRouteType(type: string): ExceptionRouteType {
  return type === '403' || type === '404' || type === '500' ? type : '404';
}

function withExceptionDetailHrefs(type: string, rows: ExceptionExplorerRowBase[]): ExceptionExplorerRow[] {
  return rows.map(row => ({
    ...row,
    href: `/exception/${type}?error=${encodeURIComponent(row.key)}`
  }));
}

function exceptionSubtitle(t: Translator, key: string, fallbackKey = 'exception.subtitle.default'): string {
  const value = t(key);
  const fallbackValue = fallbackKey === 'exception.subtitle.default'
    ? t('exception.subtitle.default')
    : t(fallbackKey);
  return value.startsWith('exception.') ? fallbackValue : value;
}

export function buildExceptionCopy(type: string, t: Translator): ExceptionCopy {
  const exceptionCopy: Record<string, ExceptionCopy> = {
    '403': {
      title: t('exception.403.title'),
      subtitle: exceptionSubtitle(t, 'exception.403.subtitle'),
      tone: 'danger',
      facts: [
        { label: t('common.workspace'), value: 'exception/403' },
        { label: t('common.status'), value: t('exception.403.fact.status') },
        { label: t('exception.fact.action'), value: t('exception.403.fact.action') }
      ],
      rows: [
        { title: t('exception.403.boundary.title'), copy: t('exception.403.boundary.copy'), meta: t('exception.403.boundary.meta') },
        { title: t('exception.next-step.title'), copy: t('exception.403.next-step.copy'), meta: t('exception.next-step.meta') }
      ]
    },
    '404': {
      title: t('exception.404.title'),
      subtitle: exceptionSubtitle(t, 'exception.404.subtitle'),
      facts: [
        { label: t('common.workspace'), value: 'exception/404' },
        { label: t('common.status'), value: t('exception.404.fact.status') },
        { label: t('exception.fact.action'), value: t('exception.404.fact.action') }
      ],
      rows: [
        { title: t('exception.404.boundary.title'), copy: t('exception.404.boundary.copy'), meta: t('exception.404.boundary.meta') },
        { title: t('exception.next-step.title'), copy: t('exception.404.next-step.copy'), meta: t('exception.next-step.meta') }
      ]
    },
    '500': {
      title: t('exception.500.title'),
      subtitle: exceptionSubtitle(t, 'exception.500.subtitle'),
      tone: 'danger',
      facts: [
        { label: t('common.workspace'), value: 'exception/500' },
        { label: t('common.status'), value: t('exception.500.fact.status') },
        { label: t('exception.fact.action'), value: t('exception.500.fact.action') }
      ],
      rows: [
        { title: t('exception.500.boundary.title'), copy: t('exception.500.boundary.copy'), meta: t('exception.500.boundary.meta') },
        { title: t('exception.next-step.title'), copy: t('exception.500.next-step.copy'), meta: t('exception.next-step.meta') }
      ]
    }
  };

  return exceptionCopy[type] || exceptionCopy['404'];
}

export function buildExceptionExplorerRows(type: string): ExceptionExplorerRow[] {
  const rows: ExceptionExplorerRowBase[] = [
    {
      key: 'econnreset-browser-frontend',
      exceptionType: 'ECONNRESET',
      errorMessage: 'read ECONNRESET',
      count: '1',
      lastSeen: '30/03/2026 11:24:59',
      firstSeen: '30/03/2026 11:24:59',
      application: 'browser-frontend'
    },
    {
      key: 'redis-cart',
      exceptionType: 'github.com/redis/go-redis/v9/internal/proto.RedisError',
      errorMessage: 'ERR unknown subcommand "main_notifications". Try CLIENT HELP.',
      count: '1',
      lastSeen: '30/03/2026 11:17:07',
      firstSeen: '30/03/2026 11:17:07',
      application: 'cart'
    },
    {
      key: 'payment-402-checkout',
      exceptionType: '*errors.errorString',
      errorMessage: 'payment service returned 402',
      count: '484',
      lastSeen: '30/03/2026 11:50:57',
      firstSeen: '30/03/2026 11:17:13',
      application: 'checkout'
    },
    {
      key: 'smtp-email',
      exceptionType: 'Error',
      errorMessage: 'SMTP connection failed',
      count: '183',
      lastSeen: '30/03/2026 11:50:37',
      firstSeen: '30/03/2026 11:17:17',
      application: 'email'
    },
    {
      key: 'payment-insufficient-funds',
      exceptionType: 'Error',
      errorMessage: 'Payment failed: insufficient funds',
      count: '484',
      lastSeen: '30/03/2026 11:50:57',
      firstSeen: '30/03/2026 11:17:13',
      application: 'payment'
    }
  ];

  if (type === '403') {
    return withExceptionDetailHrefs(type, rows.slice(0, 3).map(row => ({
      ...row,
      application: row.application === 'checkout' ? 'auth-gateway' : row.application
    })));
  }

  if (type === '404') {
    return withExceptionDetailHrefs(type, rows.slice(0, 3).map(row => ({
      ...row,
      exceptionType: row.key === 'econnreset-browser-frontend' ? 'NotFoundError' : row.exceptionType,
      errorMessage: row.key === 'econnreset-browser-frontend' ? 'route not found' : row.errorMessage
    })));
  }

  return withExceptionDetailHrefs(type, rows);
}

export function buildExceptionFilters(t: Translator): ExceptionFilterGroup[] {
  return [
    { title: t('exception.filters.deployment-environment'), values: ['demo'] },
    {
      title: t('exception.filters.service'),
      values: ['cart', 'product-catalog', 'quote-python', 'accounting', 'ad', 'browser-frontend', 'checkout', 'currency', 'email', 'fraud-detection']
    },
    { title: t('exception.filters.host'), values: [] },
    { title: t('exception.filters.k8s-cluster'), values: [] },
    { title: t('exception.filters.k8s-deployment'), values: [] },
    { title: t('exception.filters.k8s-namespace'), values: [] },
    { title: t('exception.filters.k8s-pod'), values: [] }
  ];
}

export function buildRecoveryRows(t: Translator): ExceptionRecoveryRow[] {
  return [
    { title: t('exception.rail.overview.title'), copy: t('exception.rail.overview.copy'), href: '/overview', label: t('menu.dashboard.back') },
    { title: t('exception.rail.logs.title'), copy: t('exception.rail.logs.copy'), href: '/log/manage', label: t('menu.log.manage') },
    { title: t('exception.rail.traces.title'), copy: t('exception.rail.traces.copy'), href: '/trace/manage', label: t('menu.trace.manage') }
  ];
}
