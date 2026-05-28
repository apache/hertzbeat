import { describe, expect, it, vi } from 'vitest';
import {
  buildCopyMonitorUrl,
  buildDeleteGrafanaDashboardUrl,
  buildDeleteMonitorsUrl,
  buildEnableMonitorUrl,
  buildEnableMonitorsUrl,
  buildExportAllMonitorsUrl,
  buildExportMonitorsUrl,
  buildImportMonitorsUrl,
  buildPauseMonitorUrl,
  buildPauseMonitorsUrl,
  copyMonitor,
  copyMonitorFromFacade,
  deleteGrafanaDashboard,
  deleteMonitors,
  enableMonitor,
  enableMonitors,
  importMonitorsFromFacade,
  loadMonitorListFromFacade,
  pauseMonitor,
  pauseMonitors,
  resolveDownloadFilename
} from './controller';

describe('monitor manage controller', () => {
  it('loads the monitor list through the domain facade reader', async () => {
    const readMonitorList = vi.fn().mockResolvedValue({ content: [{ id: 42 }], totalElements: 1, pageIndex: 0, pageSize: 8 });
    const query = {
      search: 'mysql',
      app: 'mysql',
      labels: '',
      status: '2',
      pageIndex: '0',
      pageSize: '8',
      entityId: '',
      entityName: '',
      returnTo: ''
    };

    await expect(loadMonitorListFromFacade(readMonitorList as any, query)).resolves.toEqual({
      content: [{ id: 42 }],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    });

    expect(readMonitorList).toHaveBeenCalledWith(query);
  });

  it('builds copy url and posts null payload', async () => {
    const apiPost = vi.fn().mockResolvedValue({ id: 108 });

    expect(buildCopyMonitorUrl(42)).toBe('/monitor/copy/42');
    await expect(copyMonitor(apiPost as any, 42)).resolves.toEqual({ id: 108 });
    expect(apiPost).toHaveBeenCalledWith('/monitor/copy/42', null);
  });

  it('copies monitors through the domain facade writer', async () => {
    const writeCopyMonitor = vi.fn().mockResolvedValue({ id: 108 });

    await expect(copyMonitorFromFacade(writeCopyMonitor, 42)).resolves.toEqual({ id: 108 });

    expect(writeCopyMonitor).toHaveBeenCalledWith(42);
  });

  it('builds enable and pause urls', async () => {
    const apiGet = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);

    expect(buildEnableMonitorUrl(42)).toBe('/monitors/manage?ids=42');
    expect(buildPauseMonitorUrl(42)).toBe('/monitors/manage?ids=42&type=JSON');

    await enableMonitor(apiGet as any, 42);
    await pauseMonitor(apiDelete as any, 42);

    expect(apiGet).toHaveBeenCalledWith('/monitors/manage?ids=42');
    expect(apiDelete).toHaveBeenCalledWith('/monitors/manage?ids=42&type=JSON');
  });

  it('builds delete-selected url with repeated ids', async () => {
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    expect(buildDeleteMonitorsUrl([1, 2, 3])).toBe('/monitors?ids=1&ids=2&ids=3');
    await deleteMonitors(apiDelete as any, [1, 2, 3]);
    expect(apiDelete).toHaveBeenCalledWith('/monitors?ids=1&ids=2&ids=3');
  });

  it('builds delete grafana url', async () => {
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    expect(buildDeleteGrafanaDashboardUrl(42)).toBe('/grafana/dashboard?monitorId=42');
    await deleteGrafanaDashboard(apiDelete as any, 42);
    expect(apiDelete).toHaveBeenCalledWith('/grafana/dashboard?monitorId=42');
  });

  it('builds batch enable and pause urls', async () => {
    const apiGet = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);

    expect(buildEnableMonitorsUrl([1, 2])).toBe('/monitors/manage?ids=1&ids=2');
    expect(buildPauseMonitorsUrl([1, 2])).toBe('/monitors/manage?ids=1&ids=2&type=JSON');

    await enableMonitors(apiGet as any, [1, 2]);
    await pauseMonitors(apiDelete as any, [1, 2]);

    expect(apiGet).toHaveBeenCalledWith('/monitors/manage?ids=1&ids=2');
    expect(apiDelete).toHaveBeenCalledWith('/monitors/manage?ids=1&ids=2&type=JSON');
  });

  it('builds export urls and resolves filenames', () => {
    expect(buildExportMonitorsUrl([1, 2], 'JSON')).toBe('/monitors/export?ids=1&ids=2&type=JSON');
    expect(buildExportAllMonitorsUrl('EXCEL')).toBe('/monitors/export/all?type=EXCEL');
    expect(buildImportMonitorsUrl()).toBe('/monitors/import');
    expect(resolveDownloadFilename('attachment; filename=monitors.json', 'fallback.json')).toBe('monitors.json');
    expect(resolveDownloadFilename(undefined, 'fallback.json')).toBe('fallback.json');
  });

  it('builds Angular-style import form data through the facade writer', async () => {
    const writeImportMonitors = vi.fn().mockResolvedValue(undefined);
    const file = new Blob(['name: mysql'], { type: 'application/x-yaml' }) as File;

    await importMonitorsFromFacade(writeImportMonitors, file);

    expect(writeImportMonitors).toHaveBeenCalledWith(expect.any(FormData));
    expect(await ((writeImportMonitors.mock.calls[0]?.[0] as FormData).get('file') as Blob).text()).toBe('name: mysql');
  });
});
