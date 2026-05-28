import { describe, expect, it } from 'vitest';
import {
  HEADER_ALERT_EVENT_TYPE,
  HEADER_ALERT_SOUND_CN,
  HEADER_ALERT_SOUND_EN,
  HEADER_ALERT_SSE_URL,
  HEADER_DUAL_SSE_CONTRACT,
  HEADER_IMPORT_TASK_EVENT_TYPE,
  HEADER_MANAGER_SSE_URL,
  buildHeaderNoticeFromAlert,
  buildManagerImportMessage,
  mergeHeaderNoticeEvent,
  parseHeaderSseJson,
  resolveHeaderAlertSoundSrc
} from './header-realtime';

describe('header realtime notification contract', () => {
  const t = (key: string, params?: Record<string, string | number | null | undefined>) => {
    const suffix = params ? `:${JSON.stringify(params)}` : '';
    return `${key}${suffix}`;
  };

  it('keeps the Angular SSE endpoints and event names', () => {
    expect(HEADER_ALERT_SSE_URL).toBe('/api/alert/sse/subscribe');
    expect(HEADER_MANAGER_SSE_URL).toBe('/api/manager/sse/subscribe');
    expect(HEADER_ALERT_EVENT_TYPE).toBe('ALERT_EVENT');
    expect(HEADER_IMPORT_TASK_EVENT_TYPE).toBe('IMPORT_TASK_EVENT');
    expect(HEADER_DUAL_SSE_CONTRACT).toBe('angular-alert-and-manager-sse');
  });

  it('maps alert SSE payloads into dropdown notices and dedupes by alert id', () => {
    const notice = buildHeaderNoticeFromAlert({
      id: 42,
      fingerprint: 'fp-42',
      content: 'CPU load high',
      status: 'firing',
      activeAt: 1779557040000
    }, 'Fallback alert');

    expect(notice).toEqual({
      id: 42,
      title: 'CPU load high',
      status: 'firing',
      activeAt: 1779557040000
    });
    expect(mergeHeaderNoticeEvent([
      { id: 1, title: 'old', status: 'firing', activeAt: 1 },
      { id: 42, title: 'stale', status: 'firing', activeAt: 2 }
    ], notice)).toEqual([
      notice,
      { id: 1, title: 'old', status: 'firing', activeAt: 1 }
    ]);
  });

  it('keeps the localized alert sound assets from the Angular service', () => {
    expect(resolveHeaderAlertSoundSrc('zh-CN')).toBe(HEADER_ALERT_SOUND_CN);
    expect(resolveHeaderAlertSoundSrc('zh-TW')).toBe(HEADER_ALERT_SOUND_CN);
    expect(resolveHeaderAlertSoundSrc('en-US')).toBe(HEADER_ALERT_SOUND_EN);
  });

  it('parses SSE json safely and maps manager import notifications', () => {
    expect(parseHeaderSseJson('{bad')).toBeNull();
    expect(parseHeaderSseJson<{ ok: boolean }>('{ "ok": true }')).toEqual({ ok: true });
    expect(buildManagerImportMessage({ notifyLevel: 'SUCCESS', taskName: 'mysql' }, t)).toMatchObject({
      status: 'live',
      meta: 'IMPORT_TASK_EVENT'
    });
    expect(buildManagerImportMessage({ notifyLevel: 'ERROR', taskName: 'mysql', errMsg: 'invalid yaml' }, t)).toMatchObject({
      status: 'error',
      meta: 'IMPORT_TASK_EVENT'
    });
    expect(buildManagerImportMessage({ notifyLevel: 'UNKNOWN' }, t)).toBeNull();
  });
});
