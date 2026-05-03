import { describe, expect, it, vi } from 'vitest';
import { buildAlertSilenceDeleteUrl, buildAlertSilenceDetailUrl, buildAlertSilenceFormDraft, buildAlertSilencePayload, createAlertSilence, deleteAlertSilence, deleteAlertSilences, loadAlertSilenceDetail, updateAlertSilence } from './controller';

describe('alert silence controller', () => {
  it('builds Angular-compatible new silence defaults with a six-hour one-time range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 19, 8, 0, 0));

    expect(buildAlertSilenceFormDraft(null)).toMatchObject({
      enable: true,
      matchAll: false,
      type: '0',
      labelsText: '',
      daysText: '7,1,2,3,4,5,6',
      periodStart: '2026-04-19T08:00',
      periodEnd: '2026-04-19T14:00',
    });

    vi.useRealTimers();
  });

  it('applies new silence fallback context without changing time defaults', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 19, 8, 0, 0));

    expect(
      buildAlertSilenceFormDraft(null, {
        name: '日志 checkout 静默',
        matchAll: false,
        labelsText: 'hertzbeat.signal:logs, service.name:checkout'
      })
    ).toMatchObject({
      name: '日志 checkout 静默',
      enable: true,
      matchAll: false,
      type: '0',
      labelsText: 'hertzbeat.signal:logs, service.name:checkout',
      daysText: '7,1,2,3,4,5,6',
      periodStart: '2026-04-19T08:00',
      periodEnd: '2026-04-19T14:00',
    });

    vi.useRealTimers();
  });

  it('builds detail and delete urls', () => {
    expect(buildAlertSilenceDetailUrl(7)).toBe('/alert/silence/7');
    expect(buildAlertSilenceDeleteUrl(7)).toBe('/alert/silences?ids=7');
    expect(buildAlertSilenceDeleteUrl([7, 8])).toBe('/alert/silences?ids=7&ids=8');
  });

  it('loads alert silence detail', async () => {
    const apiGet = vi.fn().mockResolvedValue({ id: 7, name: 'night-shift' });
    await expect(loadAlertSilenceDetail(apiGet as any, 7)).resolves.toEqual({ id: 7, name: 'night-shift' });
    expect(apiGet).toHaveBeenCalledWith('/alert/silence/7');
  });

  it('builds a form draft and payload', () => {
    expect(
      buildAlertSilenceFormDraft({
        id: 7,
        name: 'night-shift',
        enable: false,
        matchAll: false,
        type: 1,
        labels: { service: 'checkout' },
        days: [1, 2, 3],
        periodStart: '2026-04-10T08:30:00.000Z',
        periodEnd: '2026-04-10T18:00:00.000Z',
      } as any)
    ).toEqual({
      id: 7,
      name: 'night-shift',
      enable: false,
      matchAll: false,
      type: '1',
      labelsText: 'service:checkout',
      daysText: '1, 2, 3',
      periodStart: '08:30',
      periodEnd: '18:00',
    });

    expect(
      buildAlertSilencePayload({
        name: 'night-shift',
        enable: true,
        matchAll: false,
        type: '0',
        labelsText: 'service:checkout, severity:critical',
        daysText: '',
        periodStart: '2026-04-10T08:30',
        periodEnd: '2026-04-10T18:00',
      })
    ).toMatchObject({
      name: 'night-shift',
      enable: true,
      matchAll: false,
      type: 0,
      labels: { service: 'checkout', severity: 'critical' },
      days: [],
    });
    const payload = buildAlertSilencePayload({
      name: 'night-shift',
      enable: true,
      matchAll: false,
      type: '0',
      labelsText: 'service:checkout, severity:critical',
      daysText: '',
      periodStart: '2026-04-10T08:30',
      periodEnd: '2026-04-10T18:00',
    });
    expect(typeof payload.periodStart).toBe('string');
    expect(typeof payload.periodEnd).toBe('string');
  });

  it('serializes silence time payloads as backend-compatible ISO strings', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 19, 0, 0, 0));

    const oncePayload = buildAlertSilencePayload({
      name: 'one-time',
      enable: true,
      matchAll: true,
      type: '0',
      labelsText: '',
      daysText: '',
      periodStart: '2026-04-10T08:30',
      periodEnd: '2026-04-10T18:00',
    });
    const cyclicPayload = buildAlertSilencePayload({
      name: 'weekday',
      enable: true,
      matchAll: true,
      type: '1',
      labelsText: '',
      daysText: '7,1,2,3,4,5,6',
      periodStart: '09:00',
      periodEnd: '18:00',
    });

    expect(String(oncePayload.periodStart)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
    expect(String(oncePayload.periodEnd)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
    expect(String(cyclicPayload.periodStart)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
    expect(String(cyclicPayload.periodEnd)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
    expect(Number.isNaN(Date.parse(String(oncePayload.periodStart)))).toBe(false);
    expect(Number.isNaN(Date.parse(String(cyclicPayload.periodStart)))).toBe(false);
    expect(cyclicPayload.days).toEqual([7, 1, 2, 3, 4, 5, 6]);

    vi.useRealTimers();
  });

  it('creates, updates, and deletes through existing endpoints', async () => {
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    const draft = {
      name: 'weekday',
      enable: true,
      matchAll: true,
      type: '1' as const,
      labelsText: '',
      daysText: '1,2,3,4,5',
      periodStart: '09:00',
      periodEnd: '18:00',
    };

    await createAlertSilence(apiPost as any, draft);
    await updateAlertSilence(apiPut as any, { ...draft, id: 7 });
    await deleteAlertSilence(apiDelete as any, 7);
    await deleteAlertSilences(apiDelete as any, [7, 8]);

    expect(apiPost).toHaveBeenCalledWith('/alert/silence', expect.objectContaining({ name: 'weekday' }));
    expect(apiPut).toHaveBeenCalledWith('/alert/silence', expect.objectContaining({ id: 7, name: 'weekday' }));
    expect(apiDelete).toHaveBeenCalledWith('/alert/silences?ids=7');
    expect(apiDelete).toHaveBeenCalledWith('/alert/silences?ids=7&ids=8');
  });
});
