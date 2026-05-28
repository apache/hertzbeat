import type { AuthToken } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function isExpired(token: AuthToken, now = Date.now()) {
  if (!token.expireTime) return false;
  return new Date(token.expireTime).getTime() < now;
}

export function buildTokenMetrics(tokens: AuthToken[], t: Translator, now = Date.now()) {
  const activeCount = tokens.filter(token => !isExpired(token, now)).length;
  const expiredCount = tokens.filter(token => isExpired(token, now)).length;

  return [
    { label: t('setting.token.metric.total'), value: String(tokens.length) },
    { label: t('setting.token.metric.active'), value: String(activeCount), tone: 'success' },
    { label: t('setting.token.metric.expired'), value: String(expiredCount), tone: expiredCount > 0 ? 'warning' : 'success' }
  ];
}

export function buildTokenFacts(tokens: AuthToken[], t: Translator, now = Date.now()) {
  const activeCount = tokens.filter(token => !isExpired(token, now)).length;
  const expiredCount = tokens.filter(token => isExpired(token, now)).length;

  return [
    { label: t('common.workspace'), value: 'setting/settings/token' },
    { label: t('setting.token.fact.total'), value: String(tokens.length) },
    { label: t('setting.token.fact.active'), value: String(activeCount) },
    { label: t('setting.token.fact.expired'), value: String(expiredCount) }
  ];
}

function formatTokenFact(value: unknown, fallback: string) {
  const text = value == null ? '' : String(value).trim();
  return text || fallback;
}

export function buildTokenRows(tokens: AuthToken[], t: Translator, formatTime: (value?: number | string | null) => string, now = Date.now()) {
  const emptyValue = t('common.none');
  return tokens.map(token => {
    const tokenMask = formatTokenFact(token.tokenMask, emptyValue);
    const creator = formatTokenFact(token.creator, emptyValue);
    return {
      title: token.name || token.tokenMask || t('setting.token.item.fallback'),
      copy: `${tokenMask} · ${t('setting.token.row.creator', { creator })}`,
      meta: `${isExpired(token, now) ? t('setting.token.row.state.expired') : t('setting.token.row.state.active')} · ${formatTime(token.expireTime || token.gmtCreate || null)}`
    };
  });
}

export function buildTokenExpirationOptions(t: Translator) {
  return [
    { value: '-1', label: t('setting.token.expiration.never') },
    { value: '604800', label: t('setting.token.expiration.7d') },
    { value: '2592000', label: t('setting.token.expiration.30d') },
    { value: '7776000', label: t('setting.token.expiration.90d') },
    { value: '15552000', label: t('setting.token.expiration.180d') },
    { value: '31536000', label: t('setting.token.expiration.365d') }
  ];
}

export function buildTokenEmptyState(t: Translator) {
  return {
    title: t('setting.token.empty.title'),
    copy: t('setting.token.empty.copy')
  };
}
