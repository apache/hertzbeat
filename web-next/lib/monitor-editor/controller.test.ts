import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  buildMonitorDetectPayload,
  buildMonitorSavePayload,
  createMonitor,
  detectMonitor,
  isValidMonitorCronExpression,
  loadMonitorEditorDraft,
  loadMonitorScrapeDraft,
  syncMonitorDependentDisplay,
  updateMonitor,
  updateMonitorEditorParam,
  validateMonitorEditorDraft
} from './controller';

describe('monitor editor controller', () => {
  it('loads new monitor draft from app params and collectors', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ content: [{ collector: { name: 'edge-a' } }] })
      .mockResolvedValueOnce([{ field: 'host', type: 'text', defaultValue: '127.0.0.1' }])
      .mockResolvedValueOnce([]);

    await expect(loadMonitorEditorDraft(apiGet as any, 'new', { app: 'website' })).resolves.toMatchObject({
      monitor: { app: 'website', scrape: 'static', scheduleType: 'interval', intervals: 60 },
      collectors: ['edge-a'],
      params: [{ field: 'host', paramValue: '127.0.0.1' }]
    });
  });

  it('builds save/detect payloads and posts them', async () => {
    const draft = {
      monitor: { id: 1, app: 'website', name: 'demo', instance: '127.0.0.1', scrape: 'static', status: 0 },
      collector: 'edge-a',
      grafanaDashboard: { enabled: false },
      params: [{ field: 'host', paramValue: '127.0.0.1' }],
      advancedParams: [],
      scrapeParams: []
    } as any;
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);

    expect(buildMonitorSavePayload(draft)).toEqual({
      monitor: draft.monitor,
      collector: 'edge-a',
      params: [{ field: 'host', paramValue: '127.0.0.1' }],
      grafanaDashboard: { enabled: false }
    });
    expect(buildMonitorDetectPayload(draft)).toEqual({
      monitor: draft.monitor,
      collector: 'edge-a',
      params: [{ field: 'host', paramValue: '127.0.0.1' }]
    });

    await createMonitor(apiPost as any, draft);
    await updateMonitor(apiPut as any, draft);
    await detectMonitor(apiPost as any, draft);

    expect(apiPost).toHaveBeenCalledWith('/monitor', buildMonitorSavePayload(draft));
    expect(apiPut).toHaveBeenCalledWith('/monitor', buildMonitorSavePayload(draft));
    expect(apiPost).toHaveBeenCalledWith('/monitor/detect', buildMonitorDetectPayload(draft));
  });

  it('preserves existing param ids in update payloads', () => {
    const draft = {
      monitor: { id: 42, app: 'website', name: 'demo', instance: 'example.com:80', scrape: 'static', status: 1 },
      collector: '',
      grafanaDashboard: { enabled: false },
      params: [
        { id: 1, field: 'host', paramValue: 'example.com', type: 0 },
        { id: 2, field: 'port', paramValue: '80', type: 0 }
      ],
      advancedParams: [],
      scrapeParams: []
    } as any;

    expect(buildMonitorSavePayload(draft)).toEqual({
      monitor: { ...draft.monitor, instance: 'example.com' },
      collector: '',
      params: [
        { id: 1, field: 'host', paramValue: 'example.com', type: 0 },
        { id: 2, field: 'port', paramValue: '80', type: 0 }
      ],
      grafanaDashboard: { enabled: false }
    });
  });

  it('loads scrape draft params when scrape is dynamic', async () => {
    const apiGet = vi.fn().mockResolvedValue([{ field: 'service', type: 'text', defaultValue: 'catalog' }]);
    await expect(loadMonitorScrapeDraft(apiGet as any, 'http_sd')).resolves.toEqual({
      scrapeParams: [{ field: 'service', type: 1, paramValue: 'catalog' }],
      scrapeParamDefines: [{ field: 'service', type: 'text', defaultValue: 'catalog' }]
    });
  });

  it('preserves existing scrape param values on reload', async () => {
    const apiGet = vi.fn().mockResolvedValue([{ field: 'service', type: 'text', defaultValue: 'catalog' }]);
    await expect(loadMonitorScrapeDraft(apiGet as any, 'http_sd', [{ field: 'service', paramValue: 'inventory' } as any])).resolves.toEqual({
      scrapeParams: [{ field: 'service', paramValue: 'inventory', type: 1 }],
      scrapeParamDefines: [{ field: 'service', type: 'text', defaultValue: 'catalog' }]
    });
  });

  it('syncs dependent visibility and boolean side effects', () => {
    const draft = {
      monitor: { app: 'api' },
      params: [
        { field: 'ssl', paramValue: false },
        { field: 'port', paramValue: 80 },
        { field: 'token', paramValue: '', display: true }
      ],
      paramDefines: [
        { field: 'ssl', type: 'boolean' },
        { field: 'port', type: 'number' },
        { field: 'token', depend: { ssl: [true] } }
      ],
      advancedParams: [],
      advancedParamDefines: [],
      scrapeParams: [],
      scrapeParamDefines: []
    } as any;

    expect(syncMonitorDependentDisplay(draft).params[2].display).toBe(false);
    const next = updateMonitorEditorParam(draft, 'params', 0, true);
    expect(next.params[1].paramValue).toBe(443);
    expect(next.params[2].display).toBe(true);
  });

  it('trims monitor and param strings in save payloads', () => {
    const draft = {
      monitor: { id: 42, app: 'website', name: '  demo monitor  ', instance: 'example.com:80', scrape: 'static', status: 1, description: '  desc  ' },
      collector: '',
      grafanaDashboard: { enabled: false },
      params: [
        { id: 1, field: 'host', paramValue: ' example.com ', type: 1 },
        { id: 2, field: 'uri', paramValue: ' /health ', type: 1 }
      ],
      advancedParams: [],
      scrapeParams: []
    } as any;

    expect(buildMonitorSavePayload(draft)).toEqual({
      monitor: { ...draft.monitor, name: 'demo monitor', description: 'desc', instance: 'example.com' },
      collector: '',
      params: [
        { id: 1, field: 'host', paramValue: 'example.com', type: 1 },
        { id: 2, field: 'uri', paramValue: '/health', type: 1 }
      ],
      grafanaDashboard: { enabled: false }
    });
  });

  it('validates required fields and cron expressions before detect/save', () => {
    const t = createTranslatorMock();
    const draft = {
      monitor: {
        id: 0,
        app: 'website',
        name: '   ',
        instance: '',
        scrape: 'static',
        status: 0,
        scheduleType: 'cron',
        cronExpression: 'bad cron'
      },
      params: [
        { field: 'host', paramValue: '   ', display: true },
        { field: 'port', paramValue: 80, display: true }
      ],
      paramDefines: [
        { field: 'host', type: 'text', required: true, name: 'Host' },
        { field: 'port', type: 'number', required: true, name: 'Port' }
      ],
      advancedParams: [],
      advancedParamDefines: [],
      scrapeParams: [],
      scrapeParamDefines: []
    } as any;

    expect(validateMonitorEditorDraft(draft, t)).toBe('Monitor name is required');

    draft.monitor.name = 'demo';
    expect(validateMonitorEditorDraft(draft, t)).toBe('Host is required');

    draft.params[0].paramValue = 'example.com';
    expect(validateMonitorEditorDraft(draft, t)).toBe('Cron expression is invalid');
  });

  it('accepts common five-field and six-field cron expressions', () => {
    expect(isValidMonitorCronExpression('*/5 * * * *')).toBe(true);
    expect(isValidMonitorCronExpression('0 */5 * * * *')).toBe(true);
    expect(isValidMonitorCronExpression('')).toBe(false);
    expect(isValidMonitorCronExpression('bad cron')).toBe(false);
  });
});
