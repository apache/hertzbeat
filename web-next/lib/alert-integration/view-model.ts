export const DATA_SOURCES = [
  { id: 'webhook', name: '默认Webhook', icon: '/assets/logo.svg' },
  { id: 'prometheus', name: 'Prometheus', icon: '/assets/img/integration/prometheus.svg' },
  { id: 'alertmanager', name: 'Alertmanager', icon: '/assets/img/integration/prometheus.svg' },
  { id: 'skywalking', name: 'SkyWalking', icon: '/assets/img/integration/skywalking.svg' },
  { id: 'uptime-kuma', name: 'Uptime Kuma', icon: '/assets/img/integration/uptime-kuma.svg' },
  { id: 'zabbix', name: 'Zabbix', icon: '/assets/img/integration/zabbix.svg' },
  { id: 'tencent', name: '腾讯云监控', icon: '/assets/img/integration/tencent.svg' },
  { id: 'alibabacloud-sls', name: '阿里云日志服务 SLS', icon: '/assets/img/integration/alibabacloud.svg' },
  { id: 'huaweicloud-ces', name: '华为云监控服务', icon: '/assets/img/integration/huaweicloud.svg' },
  { id: 'volcengine', name: '火山引擎云监控', icon: '/assets/img/integration/volcengine.svg' }
] as const;

export function getIntegrationSource(source: string) {
  return DATA_SOURCES.find(item => item.id === source) ?? DATA_SOURCES[0];
}

export function buildIntegrationFacts(source: string, hasDoc: boolean) {
  const selectedSource = getIntegrationSource(source);
  return [
    { label: '集成接入', value: `alert/integration/${selectedSource.id}` },
    { label: '集成告警源', value: selectedSource.name },
    { label: '文档状态', value: hasDoc ? '已加载' : '回退文案' }
  ];
}

export function buildIntegrationSourceRows(source: string) {
  return DATA_SOURCES.map(item => ({
    title: item.name,
    copy: item.id,
    meta: item.id === source ? '已选中' : `/alert/integration/${item.id}`
  }));
}

export function buildIntegrationPostureRows(source: string, hasDoc: boolean) {
  return [
    { title: '文档来源', copy: `web-app/src/assets/doc/alert-integration/${source}.*.md`, meta: '现有 Angular 资产' },
    { title: '回退行为', copy: hasDoc ? '集成文档已加载' : '缺少文档时展示回退文案', meta: '行为保留' },
    { title: '令牌管理', copy: '继续使用当前 API 令牌管理入口。', meta: '/setting/settings/token' }
  ];
}
