import { describe, expect, it, vi } from 'vitest';
import {
  applyAlertClosureOperation,
  applyAlertClosureOperationFromFacade,
  buildAlertGroupCloseMutationUrl,
  buildAlertQueryAfterClosureOperation,
  clampAlertCenterPageIndexAfterDelete,
  loadAlertCenterData,
  loadAlertCenterDataFromFacade
} from './controller';

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

  it('trims oversized alert center payloads to the requested page size while preserving totals', async () => {
    const alertRows = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      alertName: `checkout-alert-${index + 1}`
    }));
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ total: 40 })
      .mockResolvedValueOnce({ content: alertRows, totalElements: 40, pageIndex: 0, pageSize: 40 })
      .mockResolvedValueOnce(undefined);

    const result = await loadAlertCenterData(apiGet, {
      search: 'checkout',
      status: 'firing',
      severity: '',
      pageIndex: 0,
      pageSize: 15,
      entityId: '',
      entityName: '',
      returnTo: ''
    });

    expect(result.groupAlerts).toEqual({
      content: alertRows.slice(0, 15),
      totalElements: 40,
      pageIndex: 0,
      pageSize: 15
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

  it('loads alert center data through the alert and entity facade boundary', async () => {
    const apiFacade = {
      alerts: {
        summary: vi.fn().mockResolvedValue({ total: 4 }),
        groupAlerts: vi.fn().mockResolvedValue({ content: [{ id: 9 }], totalElements: 1, pageIndex: 0, pageSize: 8 })
      },
      entities: {
        detail: vi.fn().mockResolvedValue({
          noiseControlSummary: {
            activeSilenceCount: 1,
            matchingInhibitCount: 0,
            possibleAlertSuppression: true
          }
        })
      }
    };
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: '42',
      entityName: 'Checkout API',
      returnTo: '/entities/42'
    };

    const result = await loadAlertCenterDataFromFacade(apiFacade, query);

    expect(apiFacade.alerts.summary).toHaveBeenCalledWith();
    expect(apiFacade.alerts.groupAlerts).toHaveBeenCalledWith(query);
    expect(apiFacade.entities.detail).toHaveBeenCalledWith(42);
    expect(result).toEqual({
      summary: { total: 4 },
      groupAlerts: { content: [{ id: 9 }], totalElements: 1, pageIndex: 0, pageSize: 8 },
      noiseControlSummary: {
        activeSilenceCount: 1,
        matchingInhibitCount: 0,
        possibleAlertSuppression: true
      }
    });
  });

  it('trims oversized alert center facade payloads to the supported page size', async () => {
    const alertRows = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      alertName: `facade-alert-${index + 1}`
    }));
    const apiFacade = {
      alerts: {
        summary: vi.fn().mockResolvedValue({ total: 40 }),
        groupAlerts: vi.fn().mockResolvedValue({ content: alertRows, totalElements: 40, pageIndex: 0, pageSize: 40 })
      },
      entities: {
        detail: vi.fn()
      }
    };
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: '',
      pageIndex: 0,
      pageSize: 25,
      entityId: '',
      entityName: '',
      returnTo: ''
    };

    const result = await loadAlertCenterDataFromFacade(apiFacade, query);

    expect(apiFacade.alerts.groupAlerts).toHaveBeenCalledWith(query);
    expect(result.groupAlerts).toEqual({
      content: alertRows.slice(0, 25),
      totalElements: 40,
      pageIndex: 0,
      pageSize: 25
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

  it('routes card-level alert closure operations through the alert facade', async () => {
    const apiAlerts = {
      groupStatus: vi.fn().mockResolvedValue(undefined),
      groupClose: vi.fn().mockResolvedValue(undefined)
    };

    await applyAlertClosureOperationFromFacade(apiAlerts, 'acknowledge', 7);
    await applyAlertClosureOperationFromFacade(apiAlerts, 'resolve', [7, 8]);
    await applyAlertClosureOperationFromFacade(apiAlerts, 'reopen', 9);
    await applyAlertClosureOperationFromFacade(apiAlerts, 'delete', 10);

    expect(apiAlerts.groupStatus).toHaveBeenNthCalledWith(1, 'acknowledged', 7);
    expect(apiAlerts.groupStatus).toHaveBeenNthCalledWith(2, 'resolved', [7, 8]);
    expect(apiAlerts.groupStatus).toHaveBeenNthCalledWith(3, 'firing', 9);
    expect(apiAlerts.groupClose).toHaveBeenCalledWith(10);
  });

  it('uses runtime fallback copy when alert group mutation ids are invalid', () => {
    expect(() => buildAlertGroupCloseMutationUrl([])).toThrow('Alert group id is required');
  });

  it('builds a post-closure reload query that keeps the acted alert visible with its new status', () => {
    const evidenceQuery = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      pageIndex: 2,
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
      status: 'acknowledged',
      pageIndex: 0
    });
    expect(buildAlertQueryAfterClosureOperation(evidenceQuery, 'recover')).toEqual({
      ...evidenceQuery,
      status: 'resolved',
      pageIndex: 0
    });
    expect(buildAlertQueryAfterClosureOperation(evidenceQuery, 'resolve')).toEqual({
      ...evidenceQuery,
      status: 'resolved',
      pageIndex: 0
    });
    expect(buildAlertQueryAfterClosureOperation({ ...evidenceQuery, status: 'acknowledged' }, 'unacknowledge')).toEqual({
      ...evidenceQuery,
      status: 'firing',
      pageIndex: 0
    });
    expect(buildAlertQueryAfterClosureOperation({ ...evidenceQuery, status: 'resolved' }, 'reopen')).toEqual({
      ...evidenceQuery,
      status: 'firing',
      pageIndex: 0
    });
    expect(buildAlertQueryAfterClosureOperation(evidenceQuery, 'close')).toEqual(evidenceQuery);
    expect(buildAlertQueryAfterClosureOperation(evidenceQuery, 'delete')).toEqual(evidenceQuery);
  });

  it('clamps the alert center page index after delete using Angular updatePageIndex semantics', () => {
    expect(
      clampAlertCenterPageIndexAfterDelete(
        {
          search: 'checkout',
          status: '',
          severity: '',
          pageIndex: 3,
          pageSize: 8,
          entityId: '',
          entityName: '',
          returnTo: ''
        },
        25,
        2
      )
    ).toEqual({
      search: 'checkout',
      status: '',
      severity: '',
      pageIndex: 2,
      pageSize: 8,
      entityId: '',
      entityName: '',
      returnTo: ''
    });

    expect(
      clampAlertCenterPageIndexAfterDelete(
        {
          search: '',
          status: '',
          severity: '',
          pageIndex: 1,
          pageSize: 15,
          entityId: '',
          entityName: '',
          returnTo: ''
        },
        1,
        1
      ).pageIndex
    ).toBe(0);
  });
});
