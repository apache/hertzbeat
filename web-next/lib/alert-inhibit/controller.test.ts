import { describe, expect, it, vi } from 'vitest';
import {
  buildAlertInhibitDeleteUrl,
  buildAlertInhibitDetailUrl,
  buildAlertInhibitEntityPrefill,
  buildAlertInhibitEntityPrefillFromFacade,
  buildAlertInhibitFormDraft,
  buildAlertInhibitPayload,
  buildEntityAlertsForInhibitPrefillUrl,
  createAlertInhibit,
  createAlertInhibitFromFacade,
  deleteAlertInhibit,
  deleteAlertInhibitFromFacade,
  deleteAlertInhibits,
  deleteAlertInhibitsFromFacade,
  extractExactCommonInhibitAlertLabels,
  loadAlertInhibitDataFromFacade,
  loadAlertInhibitDetail,
  loadAlertInhibitDetailFromFacade,
  loadMatchedAlertInhibitsFromFacade,
  updateAlertInhibit,
  updateAlertInhibitEnabledFromFacade,
  updateAlertInhibitFromFacade
} from './controller';

describe('alert inhibit controller', () => {
  it('applies new inhibit fallback evidence context without changing edit behavior', () => {
    expect(
      buildAlertInhibitFormDraft(null, {
        name: '链路 checkout 抑制',
        sourceLabelsText: 'hertzbeat.signal:traces, service.name:checkout',
        targetLabelsText: 'hertzbeat.signal:traces, service.name:checkout',
        equalLabelsText: 'service.name'
      })
    ).toEqual({
      name: '链路 checkout 抑制',
      enable: true,
      sourceLabelsText: 'hertzbeat.signal:traces, service.name:checkout',
      targetLabelsText: 'hertzbeat.signal:traces, service.name:checkout',
      equalLabelsText: 'service.name',
    });

    expect(
      buildAlertInhibitFormDraft(
        {
          id: 7,
          name: 'existing',
          enable: false,
          sourceLabels: { service: 'checkout' },
          targetLabels: { severity: 'warning' },
          equalLabels: ['cluster'],
        } as any,
        {
          name: 'fallback',
          sourceLabelsText: 'service:fallback'
        }
      )
    ).toEqual({
      id: 7,
      name: 'existing',
      enable: false,
      sourceLabelsText: 'service:checkout',
      targetLabelsText: 'severity:warning',
      equalLabelsText: 'cluster',
    });
  });

  it('builds detail and delete urls', () => {
    expect(buildAlertInhibitDetailUrl(7)).toBe('/alert/inhibit/7');
    expect(buildAlertInhibitDeleteUrl(7)).toBe('/alert/inhibits?ids=7');
    expect(buildAlertInhibitDeleteUrl([7, 8])).toBe('/alert/inhibits?ids=7&ids=8');
  });

  it('loads alert inhibit detail', async () => {
    const apiGet = vi.fn().mockResolvedValue({ id: 7, name: 'db inhibit' });
    await expect(loadAlertInhibitDetail(apiGet as any, 7)).resolves.toEqual({ id: 7, name: 'db inhibit' });
    expect(apiGet).toHaveBeenCalledWith('/alert/inhibit/7');
  });

  it('loads alert inhibit detail through facade readers', async () => {
    const readDetail = vi.fn().mockResolvedValue({ id: 7, name: 'db inhibit' });

    await expect(loadAlertInhibitDetailFromFacade(readDetail as any, 7)).resolves.toEqual({
      id: 7,
      name: 'db inhibit'
    });

    expect(readDetail).toHaveBeenCalledWith(7);
  });

  it('loads first-screen alert inhibit data through facade readers', async () => {
    const list = vi.fn().mockResolvedValue({ content: [{ id: 7, name: 'db inhibit' }], totalElements: 1, pageIndex: 0, pageSize: 8 });
    const labelOptions = vi.fn().mockResolvedValue({ keys: ['service'], valuesByKey: {} });

    await expect(loadAlertInhibitDataFromFacade({ list, labelOptions }, { search: 'db', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      list: { content: [{ id: 7, name: 'db inhibit' }], totalElements: 1, pageIndex: 0, pageSize: 8 },
      labelOptions: { keys: ['service'], valuesByKey: {} }
    });

    expect(list).toHaveBeenCalledWith({ search: 'db', pageIndex: 0, pageSize: 8 });
    expect(labelOptions).toHaveBeenCalledWith();
  });

  it('loads matched alert inhibits by id through facade readers', async () => {
    const detail = vi.fn(async (id: number) => {
      if (id === 12) throw new Error('missing');
      return { id, name: `inhibit-${id}` };
    });

    await expect(loadMatchedAlertInhibitsFromFacade(detail as any, [11, 12, 13])).resolves.toEqual({
      matched: [{ id: 13, name: 'inhibit-13' }, { id: 11, name: 'inhibit-11' }],
      missingMatchedRuleCount: 1
    });
    expect(detail).toHaveBeenCalledWith(11);
    expect(detail).toHaveBeenCalledWith(12);
    expect(detail).toHaveBeenCalledWith(13);
  });

  it('builds Angular entity-alert prefill from exact common firing labels', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      content: [
        { labels: { service: 'checkout', env: 'prod', severity: 'critical', instance: 'api-1' } },
        { labels: { service: 'checkout', env: 'prod', severity: 'warning', instance: 'api-1' } }
      ]
    });

    expect(buildEntityAlertsForInhibitPrefillUrl(42)).toBe('/entities/42/alerts?pageIndex=0&pageSize=20&status=firing');
    expect(
      extractExactCommonInhibitAlertLabels([
        { labels: { service: 'checkout', env: 'prod', severity: 'critical' } },
        { labels: { service: 'checkout', env: 'prod', severity: 'warning' } }
      ] as any)
    ).toEqual({ service: 'checkout', env: 'prod' });
    await expect(buildAlertInhibitEntityPrefill(apiGet as any, '42', 'manual warning', 'no entity')).resolves.toEqual({
      draftPatch: {
        sourceLabelsText: 'service:checkout, env:prod, instance:api-1',
        targetLabelsText: 'service:checkout, env:prod, instance:api-1',
        equalLabelsText: 'service, env, instance'
      },
      source: 'alerts-common-labels',
      warning: null
    });
    expect(apiGet).toHaveBeenCalledWith('/entities/42/alerts?pageIndex=0&pageSize=20&status=firing');

    const readEntityAlerts = vi.fn().mockResolvedValue(apiGet.mock.results[0].value);
    await expect(buildAlertInhibitEntityPrefillFromFacade(readEntityAlerts, '42', 'manual warning', 'no entity')).resolves.toEqual({
      draftPatch: {
        sourceLabelsText: 'service:checkout, env:prod, instance:api-1',
        targetLabelsText: 'service:checkout, env:prod, instance:api-1',
        equalLabelsText: 'service, env, instance'
      },
      source: 'alerts-common-labels',
      warning: null
    });
    expect(readEntityAlerts).toHaveBeenCalledWith(42);
  });

  it('falls back to Angular entity-alert prefill warnings', async () => {
    const apiGet = vi.fn().mockResolvedValue({ content: [{ labels: { severity: 'critical' } }, { labels: { severity: 'warning' } }] });

    await expect(buildAlertInhibitEntityPrefill(apiGet as any, '42', 'manual warning', 'no entity')).resolves.toEqual({
      draftPatch: { sourceLabelsText: '', targetLabelsText: '', equalLabelsText: '' },
      source: 'none',
      warning: 'manual warning'
    });
    await expect(buildAlertInhibitEntityPrefill(apiGet as any, '', 'manual warning', 'no entity')).resolves.toEqual({
      draftPatch: { sourceLabelsText: '', targetLabelsText: '', equalLabelsText: '' },
      source: 'none',
      warning: 'no entity'
    });
  });

  it('builds a form draft and payload', () => {
    expect(
      buildAlertInhibitFormDraft({
        id: 7,
        name: 'db inhibit',
        enable: false,
        sourceLabels: { service: 'checkout' },
        targetLabels: { service: 'db' },
        equalLabels: ['severity', 'env'],
      } as any)
    ).toEqual({
      id: 7,
      name: 'db inhibit',
      enable: false,
      sourceLabelsText: 'service:checkout',
      targetLabelsText: 'service:db',
      equalLabelsText: 'severity, env',
    });

    expect(
      buildAlertInhibitPayload({
        name: 'db inhibit',
        enable: true,
        sourceLabelsText: 'service:checkout, severity:critical',
        targetLabelsText: 'service:db',
        equalLabelsText: 'severity, env',
      })
    ).toEqual({
      name: 'db inhibit',
      enable: true,
      sourceLabels: { service: 'checkout', severity: 'critical' },
      targetLabels: { service: 'db' },
      equalLabels: ['severity', 'env'],
    });
  });

  it('creates, updates, and deletes through existing endpoints', async () => {
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    const draft = {
      name: 'db inhibit',
      enable: true,
      sourceLabelsText: 'service:checkout',
      targetLabelsText: 'service:db',
      equalLabelsText: 'severity',
    };

    await createAlertInhibit(apiPost as any, draft);
    await updateAlertInhibit(apiPut as any, { ...draft, id: 7 });
    await deleteAlertInhibit(apiDelete as any, 7);
    await deleteAlertInhibits(apiDelete as any, [7, 8]);

    expect(apiPost).toHaveBeenCalledWith('/alert/inhibit', expect.objectContaining({ name: 'db inhibit' }));
    expect(apiPut).toHaveBeenCalledWith('/alert/inhibit', expect.objectContaining({ id: 7, name: 'db inhibit' }));
    expect(apiDelete).toHaveBeenCalledWith('/alert/inhibits?ids=7');
    expect(apiDelete).toHaveBeenCalledWith('/alert/inhibits?ids=7&ids=8');
  });

  it('creates, updates, toggles, and deletes through facade operations', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);
    const draft = {
      name: 'db inhibit',
      enable: true,
      sourceLabelsText: 'service:checkout',
      targetLabelsText: 'service:db',
      equalLabelsText: 'severity',
    };

    await createAlertInhibitFromFacade(create, draft);
    await updateAlertInhibitFromFacade(update, { ...draft, id: 7 });
    await updateAlertInhibitEnabledFromFacade(
      update,
      {
        id: 7,
        name: 'db inhibit',
        enable: true,
        sourceLabels: { service: 'checkout' },
        targetLabels: { service: 'db' },
        equalLabels: ['severity']
      } as any,
      false
    );
    await deleteAlertInhibitFromFacade(remove, 7);
    await deleteAlertInhibitsFromFacade(remove, [7, 8]);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'db inhibit' }));
    expect(update).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 7, name: 'db inhibit' }));
    expect(update).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 7, enable: false }));
    expect(remove).toHaveBeenNthCalledWith(1, [7]);
    expect(remove).toHaveBeenNthCalledWith(2, [7, 8]);
  });
});
