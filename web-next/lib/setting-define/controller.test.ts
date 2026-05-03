import { describe, expect, it, vi } from 'vitest';
import { buildPreviewUrl, buildSkeletonDefine, loadDefineCenterData } from './controller';

describe('setting define controller', () => {
  it('loads define list and datasource status together', async () => {
    const apiMessageGet = vi.fn().mockResolvedValueOnce({ content: [], totalElements: 0 }).mockResolvedValueOnce({ code: 0, data: { ready: true } });

    const result = await loadDefineCenterData(apiMessageGet as any, '');

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/alert/define/datasource/status');
    expect(result).toEqual({
      list: { content: [], totalElements: 0 },
      datasourceStatus: { code: 0, data: { ready: true } }
    });
  });

  it('builds preview url from datasource and expr params', () => {
    expect(buildPreviewUrl({ datasource: 'promql', type: 'realtime_metric', expr: 'up == 0' } as any)).toBe(
      '/alert/define/preview/promql?type=realtime_metric&expr=up+%3D%3D+0'
    );
  });

  it('creates a skeleton define with stable defaults', () => {
    expect(buildSkeletonDefine()).toMatchObject({
      name: 'next-migrated-define',
      datasource: 'promql',
      expr: 'up == 0',
      enable: true
    });
  });
});
