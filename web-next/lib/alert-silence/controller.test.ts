import { describe, expect, it, vi } from 'vitest';
import {
  buildAlertSilenceDeleteUrl,
  buildAlertSilenceDetailUrl,
  buildAlertSilenceEntityPrefill,
  buildAlertSilenceEntityPrefillFromFacade,
  buildAlertSilenceFormDraft,
  buildAlertSilencePayload,
  buildEntityAlertsForSilencePrefillUrl,
  createAlertSilence,
  createAlertSilenceFromFacade,
  deleteAlertSilence,
  deleteAlertSilenceFromFacade,
  deleteAlertSilences,
  deleteAlertSilencesFromFacade,
  extractExactCommonAlertLabels,
  loadAlertSilenceDataFromFacade,
  loadAlertSilenceDetail,
  loadAlertSilenceDetailFromFacade,
  loadMatchedAlertSilencesFromFacade,
  updateAlertSilence,
  updateAlertSilenceEnabledFromFacade,
  updateAlertSilenceFromFacade
} from './controller';

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

  it('loads alert silence detail through facade readers', async () => {
    const readDetail = vi.fn().mockResolvedValue({ id: 7, name: 'night-shift' });

    await expect(loadAlertSilenceDetailFromFacade(readDetail as any, 7)).resolves.toEqual({
      id: 7,
      name: 'night-shift'
    });

    expect(readDetail).toHaveBeenCalledWith(7);
  });

  it('loads first-screen alert silence data through facade readers', async () => {
    const list = vi.fn().mockResolvedValue({ content: [{ id: 7, name: 'weekday' }], totalElements: 1, pageIndex: 0, pageSize: 8 });
    const labelOptions = vi.fn().mockResolvedValue({ keys: ['service'], valuesByKey: {} });

    await expect(loadAlertSilenceDataFromFacade({ list, labelOptions }, { search: 'weekday', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      list: { content: [{ id: 7, name: 'weekday' }], totalElements: 1, pageIndex: 0, pageSize: 8 },
      labelOptions: { keys: ['service'], valuesByKey: {} }
    });

    expect(list).toHaveBeenCalledWith({ search: 'weekday', pageIndex: 0, pageSize: 8 });
    expect(labelOptions).toHaveBeenCalledWith();
  });

  it('loads matched alert silences by id through facade readers', async () => {
    const detail = vi.fn(async (id: number) => {
      if (id === 12) throw new Error('missing');
      return { id, name: `silence-${id}` };
    });

    await expect(loadMatchedAlertSilencesFromFacade(detail as any, [11, 12, 13])).resolves.toEqual({
      matched: [{ id: 13, name: 'silence-13' }, { id: 11, name: 'silence-11' }],
      missingMatchedRuleCount: 1
    });
    expect(detail).toHaveBeenCalledWith(11);
    expect(detail).toHaveBeenCalledWith(12);
    expect(detail).toHaveBeenCalledWith(13);
  });

  it('builds Angular entity alert prefill from stable common labels', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      content: [
        { id: 1, fingerprint: 'a', labels: { service: 'checkout', severity: 'critical', env: 'prod' } },
        { id: 2, fingerprint: 'b', labels: { service: 'checkout', severity: 'warning', env: 'prod' } }
      ],
      totalElements: 2,
      pageIndex: 0,
      pageSize: 20
    });

    expect(buildEntityAlertsForSilencePrefillUrl(42)).toBe('/entities/42/alerts?pageIndex=0&pageSize=20&status=firing');
    expect(
      extractExactCommonAlertLabels([
        { id: 1, fingerprint: 'a', labels: { service: 'checkout', severity: 'critical', env: 'prod' } },
        { id: 2, fingerprint: 'b', labels: { service: 'checkout', severity: 'warning', env: 'prod' } }
      ])
    ).toEqual({ service: 'checkout', env: 'prod' });
    await expect(buildAlertSilenceEntityPrefill(apiGet as any, '42', 'manual warning', 'no entity')).resolves.toEqual({
      draftPatch: {
        matchAll: false,
        labelsText: 'service:checkout, env:prod'
      },
      source: 'alerts-common-labels',
      warning: null
    });
    expect(apiGet).toHaveBeenCalledWith('/entities/42/alerts?pageIndex=0&pageSize=20&status=firing');

    const readEntityAlerts = vi.fn().mockResolvedValue(apiGet.mock.results[0].value);
    await expect(buildAlertSilenceEntityPrefillFromFacade(readEntityAlerts, '42', 'manual warning', 'no entity')).resolves.toEqual({
      draftPatch: {
        matchAll: false,
        labelsText: 'service:checkout, env:prod'
      },
      source: 'alerts-common-labels',
      warning: null
    });
    expect(readEntityAlerts).toHaveBeenCalledWith(42);
  });

  it('falls back to Angular manual-entry warning when entity alert prefill has no stable labels', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      content: [{ id: 1, fingerprint: 'a', labels: { service: 'checkout' } }, { id: 2, fingerprint: 'b', labels: { service: 'orders' } }],
      totalElements: 2,
      pageIndex: 0,
      pageSize: 20
    });

    await expect(buildAlertSilenceEntityPrefill(apiGet as any, '42', 'manual warning', 'no entity')).resolves.toEqual({
      draftPatch: { labelsText: '' },
      source: 'none',
      warning: 'manual warning'
    });
    await expect(buildAlertSilenceEntityPrefill(apiGet as any, '', 'manual warning', 'no entity')).resolves.toEqual({
      draftPatch: { labelsText: '' },
      source: 'none',
      warning: 'no entity'
    });
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

  it('creates, updates, toggles, and deletes through facade operations', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);
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

    await createAlertSilenceFromFacade(create, draft);
    await updateAlertSilenceFromFacade(update, { ...draft, id: 7 });
    await updateAlertSilenceEnabledFromFacade(
      update,
      {
        id: 7,
        name: 'weekday',
        enable: true,
        matchAll: true,
        type: 1,
        days: [1, 2, 3, 4, 5],
        periodStart: '2026-04-10T09:00:00.000Z',
        periodEnd: '2026-04-10T18:00:00.000Z'
      } as any,
      false
    );
    await deleteAlertSilenceFromFacade(remove, 7);
    await deleteAlertSilencesFromFacade(remove, [7, 8]);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'weekday' }));
    expect(update).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 7, name: 'weekday' }));
    expect(update).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 7, enable: false }));
    expect(remove).toHaveBeenNthCalledWith(1, [7]);
    expect(remove).toHaveBeenNthCalledWith(2, [7, 8]);
  });
});
