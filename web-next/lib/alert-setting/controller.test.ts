import { describe, expect, it, vi } from 'vitest';
import {
  buildAlertDefineDeleteUrl,
  deleteAlertDefine,
  deleteAlertDefines,
  loadAlertDefineDetail,
  loadAlertSettingData,
  updateAlertDefineEnabled
} from './controller';

describe('alert setting controller', () => {
  it('loads the alert-define list and datasource status for the shared settings console', async () => {
    const apiGet = vi.fn().mockResolvedValueOnce({ code: 0, data: { promql: true } });
    const apiMessageGet = vi.fn().mockResolvedValueOnce({
      totalElements: 2,
      pageIndex: 0,
      pageSize: 8,
      content: [{ id: 7, name: 'cpu threshold' }]
    });

    const result = await loadAlertSettingData(apiGet as any, apiMessageGet as any, 'cpu threshold');

    expect(apiMessageGet).toHaveBeenCalledWith(
      '/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc&search=%5B%22cpu%20threshold%22%5D'
    );
    expect(apiGet).toHaveBeenCalledWith('/alert/define/datasource/status');
    expect(result.datasourceStatus.code).toBe(0);
    expect(result.list.totalElements).toBe(2);
  });

  it('deletes alert defines through the same bulk endpoint as the Angular alert setting flow', async () => {
    const apiDelete = vi.fn().mockResolvedValue(undefined);

    expect(buildAlertDefineDeleteUrl(7)).toBe('/alert/defines?ids=7');
    expect(buildAlertDefineDeleteUrl([7, 8])).toBe('/alert/defines?ids=7&ids=8');

    await deleteAlertDefine(apiDelete as any, 7);
    await deleteAlertDefines(apiDelete as any, [7, 8]);

    expect(apiDelete).toHaveBeenNthCalledWith(1, '/alert/defines?ids=7');
    expect(apiDelete).toHaveBeenNthCalledWith(2, '/alert/defines?ids=7&ids=8');
  });

  it('loads a threshold rule detail before opening the edit flow', async () => {
    const apiMessageGet = vi.fn().mockResolvedValueOnce({
      id: 7,
      name: 'cpu threshold',
      type: 'periodic_trace',
      expr: 'span.error.count > 0',
      template: 'trace errors',
      labels: { severity: 'critical' },
      enable: true
    });

    const result = await loadAlertDefineDetail(apiMessageGet as any, 7);

    expect(apiMessageGet).toHaveBeenCalledWith('/alert/define/7');
    expect(result).toEqual(expect.objectContaining({
      id: 7,
      name: 'cpu threshold',
      type: 'periodic_trace'
    }));
  });

  it('toggles alert define enablement through the threshold rule update endpoint', async () => {
    const apiPut = vi.fn().mockResolvedValue(undefined);

    await updateAlertDefineEnabled(
      apiPut as any,
      {
        id: 7,
        name: 'cpu threshold',
        type: 'realtime_metric',
        expr: 'cpu_usage > 80',
        enable: true
      } as any,
      false
    );

    expect(apiPut).toHaveBeenCalledWith(
      '/alert/define',
      expect.objectContaining({
        id: 7,
        name: 'cpu threshold',
        enable: false
      })
    );
  });
});
