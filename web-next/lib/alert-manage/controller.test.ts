import { describe, expect, it, vi } from 'vitest';
import { applyAlertClosureOperation, buildAlertQueryAfterClosureOperation, loadAlertCenterData } from './controller';

describe('alert controller', () => {
  it('loads summary and alert list together', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ total: 9 })
      .mockResolvedValueOnce({ content: [{ id: 1 }], totalElements: 1, pageIndex: 0, pageSize: 8 })
      .mockResolvedValueOnce(undefined);

    const result = await loadAlertCenterData(apiGet, {
      search: ' checkout ',
      status: ' firing ',
      severity: ' critical ',
      entityId: '',
      entityName: '',
      returnTo: ''
    });

    expect(apiGet).toHaveBeenNthCalledWith(1, '/alerts/summary');
    expect(apiGet).toHaveBeenNthCalledWith(
      2,
      '/alerts/group?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&status=firing&severity=critical'
    );
    expect(result).toEqual({
      summary: { total: 9 },
      groupAlerts: { content: [{ id: 1 }], totalElements: 1, pageIndex: 0, pageSize: 8 },
      noiseControlSummary: undefined
    });
  });

  it('loads entity noise-control context when the alert workbench is scoped to one entity', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ total: 2 })
      .mockResolvedValueOnce({ content: [], totalElements: 0, pageIndex: 0, pageSize: 8 })
      .mockResolvedValueOnce({
        noiseControlSummary: {
          activeSilenceCount: 1,
          matchingInhibitCount: 2,
          possibleAlertSuppression: true,
          activeSilences: [{ id: 11, name: 'silence-1', type: 'silence' }],
          matchingInhibits: [{ id: 22, name: 'inhibit-1', type: 'inhibit' }]
        }
      });

    const result = await loadAlertCenterData(apiGet, {
      search: '',
      status: 'firing',
      severity: '',
      entityId: '42',
      entityName: 'Checkout API',
      returnTo: '/entities/42'
    });

    expect(apiGet).toHaveBeenNthCalledWith(3, '/entities/42/detail');
    expect(result.noiseControlSummary).toEqual({
      activeSilenceCount: 1,
      matchingInhibitCount: 2,
      possibleAlertSuppression: true,
      activeSilences: [{ id: 11, name: 'silence-1', type: 'silence' }],
      matchingInhibits: [{ id: 22, name: 'inhibit-1', type: 'inhibit' }]
    });
  });

  it('maps OTLP alert closure operations to the existing group-alert mutation endpoints', async () => {
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);

    await applyAlertClosureOperation(apiPut, apiDelete, 'acknowledge', 7);
    await applyAlertClosureOperation(apiPut, apiDelete, 'recover', [7, 8]);
    await applyAlertClosureOperation(apiPut, apiDelete, 'close', 7);

    expect(apiPut).toHaveBeenNthCalledWith(1, '/alerts/group/status/acknowledged?ids=7', null);
    expect(apiPut).toHaveBeenNthCalledWith(2, '/alerts/group/status/resolved?ids=7&ids=8', null);
    expect(apiDelete).toHaveBeenCalledWith('/alerts/group?ids=7');
  });

  it('reuses the same group-alert mutation path for card-level acknowledge, resolve, reopen, and delete actions', async () => {
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);

    await applyAlertClosureOperation(apiPut, apiDelete, 'resolve', 7);
    await applyAlertClosureOperation(apiPut, apiDelete, 'unacknowledge', 7);
    await applyAlertClosureOperation(apiPut, apiDelete, 'reopen', 8);
    await applyAlertClosureOperation(apiPut, apiDelete, 'delete', 9);

    expect(apiPut).toHaveBeenNthCalledWith(1, '/alerts/group/status/resolved?ids=7', null);
    expect(apiPut).toHaveBeenNthCalledWith(2, '/alerts/group/status/firing?ids=7', null);
    expect(apiPut).toHaveBeenNthCalledWith(3, '/alerts/group/status/firing?ids=8', null);
    expect(apiDelete).toHaveBeenCalledWith('/alerts/group?ids=9');
  });

  it('builds a post-closure reload query that moves status while preserving evidence context', () => {
    const evidenceQuery = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      signal: 'logs',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'collector-a',
      template: 'spring-boot',
      viewMode: 'resource-dependency',
      sourceKind: 'alert-impact',
      edgeId: 'svc-checkout--orders-db',
      returnTo: '/log/manage?traceId=trace-123'
    };

    expect(buildAlertQueryAfterClosureOperation(evidenceQuery, 'acknowledge')).toEqual({
      ...evidenceQuery,
      status: 'acknowledged'
    });
    expect(buildAlertQueryAfterClosureOperation(evidenceQuery, 'recover')).toEqual({
      ...evidenceQuery,
      status: 'resolved'
    });
    expect(buildAlertQueryAfterClosureOperation(evidenceQuery, 'reopen')).toEqual({
      ...evidenceQuery,
      status: 'firing'
    });
    expect(buildAlertQueryAfterClosureOperation(evidenceQuery, 'close')).toEqual({
      ...evidenceQuery,
      status: ''
    });
  });
});
