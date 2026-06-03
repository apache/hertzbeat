import { interpolate, normalizeLocale, type LocaleCode, type TranslationParams } from '../i18n';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';

export type AlertIntegrationTranslator = (key: string, params?: TranslationParams) => string;

export function translateAlertIntegration(key: string, params?: TranslationParams, locale: LocaleCode | string = 'en-US') {
  const normalizedLocale = normalizeLocale(locale);
  const template = SUPPLEMENTAL_MESSAGES[normalizedLocale]?.[key] ?? SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;
  return interpolate(template, params);
}

export function createAlertIntegrationTranslator(locale: LocaleCode | string): AlertIntegrationTranslator {
  const normalizedLocale = normalizeLocale(locale);
  return (key, params) => translateAlertIntegration(key, params, normalizedLocale);
}

export const DATA_SOURCES = [
  { id: 'webhook', nameKey: 'alert.integration.source.webhook', icon: '/assets/logo.svg' },
  { id: 'prometheus', nameKey: 'alert.integration.source.prometheus', icon: '/assets/img/integration/prometheus.svg' },
  { id: 'alertmanager', nameKey: 'alert.integration.source.alertmanager', icon: '/assets/img/integration/prometheus.svg' },
  { id: 'skywalking', nameKey: 'alert.integration.source.skywalking', icon: '/assets/img/integration/skywalking.svg' },
  { id: 'uptime-kuma', nameKey: 'alert.integration.source.uptime-kuma', icon: '/assets/img/integration/uptime-kuma.svg' },
  { id: 'zabbix', nameKey: 'alert.integration.source.zabbix', icon: '/assets/img/integration/zabbix.svg' },
  { id: 'tencent', nameKey: 'alert.integration.source.tencent', icon: '/assets/img/integration/tencent.svg' },
  { id: 'alibabacloud-sls', nameKey: 'alert.integration.source.alibabacloud-sls', icon: '/assets/img/integration/alibabacloud.svg' },
  { id: 'huaweicloud-ces', nameKey: 'alert.integration.source.huaweicloud-ces', icon: '/assets/img/integration/huaweicloud.svg' },
  { id: 'volcengine', nameKey: 'alert.integration.source.volcengine', icon: '/assets/img/integration/volcengine.svg' }
] as const;

export type IntegrationSource = (typeof DATA_SOURCES)[number];

export function buildAlertIntegrationSourceHref(source: IntegrationSource) {
  return `/alert/integration/${source.id}`;
}

export function getIntegrationSource(source: string) {
  return DATA_SOURCES.find(item => item.id === source) ?? DATA_SOURCES[0];
}

export function getIntegrationSourceName(source: IntegrationSource, t: AlertIntegrationTranslator = translateAlertIntegration) {
  return t(source.nameKey);
}

export function buildIntegrationFacts(source: string, hasDoc: boolean, t: AlertIntegrationTranslator = translateAlertIntegration) {
  const selectedSource = getIntegrationSource(source);
  return [
    { label: t('alert.integration.kicker'), value: `alert/integration/${selectedSource.id}` },
    { label: t('alert.integration.sources'), value: getIntegrationSourceName(selectedSource, t) },
    { label: t('alert.integration.fact.doc-status'), value: hasDoc ? t('alert.integration.fact.doc-loaded') : t('alert.integration.fact.doc-fallback') }
  ];
}

export function buildIntegrationSourceRows(source: string, t: AlertIntegrationTranslator = translateAlertIntegration) {
  return DATA_SOURCES.map(item => ({
    title: getIntegrationSourceName(item, t),
    copy: item.id,
    meta: item.id === source ? t('alert.integration.source.selected') : buildAlertIntegrationSourceHref(item)
  }));
}

export function buildIntegrationPostureRows(source: string, hasDoc: boolean, t: AlertIntegrationTranslator = translateAlertIntegration) {
  return [
    {
      title: t('alert.integration.posture.doc-source'),
      copy: `web-next/public/assets/doc/alert-integration/${source}.*.md`,
      meta: t('alert.integration.posture.existing-asset')
    },
    {
      title: t('alert.integration.posture.fallback-behavior'),
      copy: hasDoc ? t('alert.integration.posture.doc-loaded') : t('alert.integration.posture.doc-missing'),
      meta: t('alert.integration.posture.behavior-preserved')
    },
    {
      title: t('alert.integration.posture.token-management'),
      copy: t('alert.integration.posture.token-copy'),
      meta: '/setting/settings/token'
    }
  ];
}
