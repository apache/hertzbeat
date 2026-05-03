import { describe, expect, it, vi } from 'vitest';
import { buildAlertInhibitDeleteUrl, buildAlertInhibitDetailUrl, buildAlertInhibitFormDraft, buildAlertInhibitPayload, createAlertInhibit, deleteAlertInhibit, deleteAlertInhibits, loadAlertInhibitDetail, updateAlertInhibit } from './controller';

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
});
