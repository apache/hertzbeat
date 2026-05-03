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
  deleteGrafanaDashboard,
  deleteMonitors,
  enableMonitor,
  enableMonitors,
  pauseMonitor,
  pauseMonitors,
  resolveDownloadFilename
} from './controller';

describe('monitor manage controller', () => {
  it('builds copy url and posts null payload', async () => {
    const apiPost = vi.fn().mockResolvedValue({ id: 108 });

    expect(buildCopyMonitorUrl(42)).toBe('/monitor/copy/42');
    await expect(copyMonitor(apiPost as any, 42)).resolves.toEqual({ id: 108 });
    expect(apiPost).toHaveBeenCalledWith('/monitor/copy/42', null);
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
});
