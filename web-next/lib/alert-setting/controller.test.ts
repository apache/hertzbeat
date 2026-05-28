import { describe, expect, it, vi } from 'vitest';
import {
  buildAlertDefineDeleteUrl,
  buildAlertDefineExportUrl,
  buildAlertDefineImportUrl,
  createAlertDefineFromFacade,
  deleteAlertDefine,
  deleteAlertDefineFromFacade,
  deleteAlertDefines,
  deleteAlertDefinesFromFacade,
  loadAlertDefineDetail,
  loadAlertDefineDetailFromFacade,
  loadAlertSettingData,
  loadAlertSettingDataFromFacade,
  updateAlertDefineEnabled,
  updateAlertDefineEnabledFromFacade,
  updateAlertDefineFromFacade
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

    const result = await loadAlertSettingData(apiGet as any, apiMessageGet as any, '数据库', 2, 15, [
      { key: 'mysql', value: 'MySQL数据库' }
    ]);

    expect(apiMessageGet).toHaveBeenCalledWith(
      '/alert/defines?pageIndex=2&pageSize=15&sort=id&order=desc&search=%5B%22mysql%22%5D'
    );
    expect(apiGet).toHaveBeenCalledWith('/alert/define/datasource/status');
    expect(result.datasourceStatus.code).toBe(0);
    expect(result.list.totalElements).toBe(2);
  });

  it('loads the alert-define list and datasource status through the domain facade readers', async () => {
    const readers = {
      list: vi.fn().mockResolvedValue({
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8,
        content: [{ id: 11, name: 'memory threshold' }]
      }),
      datasourceStatus: vi.fn().mockResolvedValue({ code: 0, data: { sql: true } })
    };

    const appEntries = [{ key: 'linux', value: 'Linux主机' }];
    const result = await loadAlertSettingDataFromFacade(readers, 'memory threshold', 1, 25, appEntries);

    expect(readers.list).toHaveBeenCalledWith('memory threshold', 1, 25, appEntries);
    expect(readers.datasourceStatus).toHaveBeenCalledWith();
    expect(result.list.content[0]).toEqual(expect.objectContaining({ id: 11 }));
    expect(result.datasourceStatus.code).toBe(0);
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

  it('builds Angular-compatible alert define import and export endpoints', () => {
    expect(buildAlertDefineExportUrl([7, 8], 'JSON')).toBe('/alert/defines/export?ids=7&ids=8&type=JSON');
    expect(buildAlertDefineExportUrl(7, 'EXCEL')).toBe('/alert/defines/export?ids=7&type=EXCEL');
    expect(buildAlertDefineImportUrl()).toBe('/alert/defines/import');
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

  it('delegates alert define detail and mutations through facade helpers', async () => {
    const readDetail = vi.fn().mockResolvedValue({ id: 7, name: 'cpu threshold' });
    const createDefine = vi.fn().mockResolvedValue({ id: 8 });
    const updateDefine = vi.fn().mockResolvedValue(undefined);
    const deleteDefines = vi.fn().mockResolvedValue(undefined);

    await expect(loadAlertDefineDetailFromFacade(readDetail, 7)).resolves.toEqual({ id: 7, name: 'cpu threshold' });
    await createAlertDefineFromFacade(createDefine, { name: 'memory threshold' });
    await updateAlertDefineFromFacade(updateDefine, { id: 7, name: 'cpu threshold' });
    await updateAlertDefineEnabledFromFacade(updateDefine, { id: 7, name: 'cpu threshold', enable: true } as any, false);
    await deleteAlertDefineFromFacade(deleteDefines, 7);
    await deleteAlertDefinesFromFacade(deleteDefines, [7, 8]);

    expect(readDetail).toHaveBeenCalledWith(7);
    expect(createDefine).toHaveBeenCalledWith({ name: 'memory threshold' });
    expect(updateDefine).toHaveBeenNthCalledWith(1, { id: 7, name: 'cpu threshold' });
    expect(updateDefine).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 7, enable: false }));
    expect(deleteDefines).toHaveBeenNthCalledWith(1, [7]);
    expect(deleteDefines).toHaveBeenNthCalledWith(2, [7, 8]);
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
