type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type ExceptionCopy = {
  title: string;
  subtitle: string;
  tone?: 'default' | 'danger';
  facts: Array<{ label: string; value: string }>;
  rows: Array<{ title: string; copy: string; meta?: string }>;
};

export type ExceptionExplorerRow = {
  key: string;
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

export function buildExceptionCopy(type: string, t: Translator): ExceptionCopy {
  const exceptionCopy: Record<string, ExceptionCopy> = {
    '403': {
      title: '403 无权限访问',
      subtitle: t('exception.403.subtitle'),
      tone: 'danger',
      facts: [
        { label: t('common.workspace'), value: 'exception/403' },
        { label: t('common.status'), value: '权限边界' },
        { label: t('common.action'), value: '复核访问策略' }
      ],
      rows: [
        { title: t('exception.403.boundary.title'), copy: t('exception.403.boundary.copy'), meta: 'authz' },
        { title: t('exception.next-step.title'), copy: t('exception.403.next-step.copy'), meta: 'operator action' }
      ]
    },
    '404': {
      title: '404 路由不存在',
      subtitle: t('exception.404.subtitle'),
      facts: [
        { label: t('common.workspace'), value: 'exception/404' },
        { label: t('common.status'), value: '路由缺失' },
        { label: t('common.action'), value: '返回或重定向' }
      ],
      rows: [
        { title: t('exception.404.boundary.title'), copy: t('exception.404.boundary.copy'), meta: 'routing' },
        { title: t('exception.next-step.title'), copy: t('exception.404.next-step.copy'), meta: 'operator action' }
      ]
    },
    '500': {
      title: '500 运行时异常',
      subtitle: t('exception.500.subtitle'),
      tone: 'danger',
      facts: [
        { label: t('common.workspace'), value: 'exception/500' },
        { label: t('common.status'), value: '运行时故障' },
        { label: t('common.action'), value: '重试或排查' }
      ],
      rows: [
        { title: t('exception.500.boundary.title'), copy: t('exception.500.boundary.copy'), meta: 'runtime' },
        { title: t('exception.next-step.title'), copy: t('exception.500.next-step.copy'), meta: 'operator action' }
      ]
    }
  };

  return exceptionCopy[type] || exceptionCopy['404'];
}

export function buildExceptionExplorerRows(type: string): ExceptionExplorerRow[] {
  const rows = [
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
    return rows.slice(0, 3).map(row => ({
      ...row,
      application: row.application === 'checkout' ? 'auth-gateway' : row.application
    }));
  }

  if (type === '404') {
    return rows.slice(0, 3).map(row => ({
      ...row,
      exceptionType: row.key === 'econnreset-browser-frontend' ? 'NotFoundError' : row.exceptionType,
      errorMessage: row.key === 'econnreset-browser-frontend' ? 'route not found' : row.errorMessage
    }));
  }

  return rows;
}

export function buildExceptionFilters(): ExceptionFilterGroup[] {
  return [
    { title: '部署环境', values: ['demo'] },
    {
      title: '服务',
      values: ['cart', 'product-catalog', 'quote-python', 'accounting', 'ad', 'browser-frontend', 'checkout', 'currency', 'email', 'fraud-detection']
    },
    { title: '主机', values: [] },
    { title: 'K8s 集群', values: [] },
    { title: 'K8s Deployment', values: [] },
    { title: 'K8s 命名空间', values: [] },
    { title: 'K8s Pod', values: [] }
  ];
}

export function buildRecoveryRows(t: Translator) {
  return [
    { title: t('exception.rail.overview.title'), copy: t('exception.rail.overview.copy'), meta: '/overview' },
    { title: t('exception.rail.logs.title'), copy: t('exception.rail.logs.copy'), meta: '/log/manage' },
    { title: t('exception.rail.traces.title'), copy: t('exception.rail.traces.copy'), meta: '/trace/manage' }
  ];
}
