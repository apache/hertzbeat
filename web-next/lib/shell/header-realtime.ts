import type { SingleAlert } from '@/lib/types';

export const HEADER_ALERT_SSE_URL = '/api/alert/sse/subscribe';
export const HEADER_MANAGER_SSE_URL = '/api/manager/sse/subscribe';
export const HEADER_ALERT_EVENT_TYPE = 'ALERT_EVENT';
export const HEADER_IMPORT_TASK_EVENT_TYPE = 'IMPORT_TASK_EVENT';
export const HEADER_DUAL_SSE_CONTRACT = 'angular-alert-and-manager-sse';
export const HEADER_ALERT_SOUND_CN = '/assets/audio/default-alert-CN.mp3';
export const HEADER_ALERT_SOUND_EN = '/assets/audio/default-alert-EN.mp3';

export type HeaderRealtimeStatus = 'connecting' | 'live' | 'idle' | 'error' | 'unsupported';

export type HeaderNoticeEvent = {
  id: number;
  title: string;
  status: string;
  activeAt?: number | null;
};

export type HeaderManagerImportEvent = {
  notifyLevel?: 'SUCCESS' | 'ERROR' | 'INFO' | string;
  taskName?: string;
  errMsg?: string;
  progress?: number | string;
};

export function buildHeaderNoticeFromAlert(alert: SingleAlert, fallbackTitle: string): HeaderNoticeEvent {
  return {
    id: alert.id,
    title: alert.content || fallbackTitle,
    status: alert.status || 'firing',
    activeAt: alert.activeAt ?? alert.gmtUpdate ?? null
  };
}

export function mergeHeaderNoticeEvent(current: HeaderNoticeEvent[], event: HeaderNoticeEvent, limit = 5): HeaderNoticeEvent[] {
  return [
    event,
    ...current.filter(item => item.id !== event.id)
  ].slice(0, limit);
}

export function resolveHeaderAlertSoundSrc(locale: string): string {
  return locale === 'zh-CN' || locale === 'zh-TW' ? HEADER_ALERT_SOUND_CN : HEADER_ALERT_SOUND_EN;
}

export function parseHeaderSseJson<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export function buildManagerImportMessage(
  event: HeaderManagerImportEvent,
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string
) {
  const taskName = event.taskName || t('common.unknown');
  if (event.notifyLevel === 'SUCCESS') {
    return {
      status: 'live' as const,
      title: t('common.notice'),
      description: t('common.notify.import-success-detail', { taskName }),
      meta: 'IMPORT_TASK_EVENT'
    };
  }
  if (event.notifyLevel === 'ERROR') {
    return {
      status: 'error' as const,
      title: t('common.notice'),
      description: t('common.notify.import-fail-detail', { taskName, errMsg: event.errMsg || t('common.failed') }),
      meta: 'IMPORT_TASK_EVENT'
    };
  }
  if (event.notifyLevel === 'INFO') {
    return {
      status: 'live' as const,
      title: t('common.notice'),
      description: t('common.notify.import-progress', { taskName, progress: event.progress ?? 0 }),
      meta: 'IMPORT_TASK_EVENT'
    };
  }
  return null;
}
