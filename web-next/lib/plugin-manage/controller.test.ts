import { describe, expect, it, vi } from 'vitest';
import { buildPluginParamDefineUrl, buildPluginParamDraft, buildPluginUploadFormData, clampPluginPageIndexAfterDelete, createEmptyPluginDraft, deletePlugin, deletePlugins, loadPluginData, loadPluginParamDraft, savePlugin, savePluginParams, togglePluginStatus, updatePluginParamDraft, validatePluginUploadDraft } from './controller';

describe('plugin manage controller', () => {
  it('loads plugins through the shared query-state url', async () => {
    const apiMessageGet = vi.fn().mockResolvedValue({ content: [], totalElements: 0, pageIndex: 0, pageSize: 8 });

    const result = await loadPluginData(apiMessageGet as any, { search: 'smtp' });

    expect(apiMessageGet).toHaveBeenCalledWith('/plugin?pageIndex=0&pageSize=8&search=smtp');
    expect(result).toEqual({
      list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 }
    });
  });

  it('builds an empty upload draft for the shared plugin dialog', () => {
    expect(createEmptyPluginDraft()).toEqual({
      name: '',
      jarFileName: '',
      jarFile: null,
      enableStatus: true
    });
  });

  it('routes plugin save, status toggle, and delete requests through the expected endpoints', async () => {
    const apiMessagePost = vi.fn().mockResolvedValue('created');
    const apiMessagePut = vi.fn().mockResolvedValue('updated');
    const apiMessageDelete = vi.fn().mockResolvedValue('deleted');

    const jarFile = new Blob(['plugin'], { type: 'application/java-archive' });

    await savePlugin(apiMessagePost as any, { name: ' smtp ', jarFileName: 'plugin.jar', jarFile, enableStatus: true });
    await togglePluginStatus(apiMessagePut as any, { id: 7, name: 'smtp', enableStatus: true } as any);
    await deletePlugin(apiMessageDelete as any, 7);
    await deletePlugins(apiMessageDelete as any, [7, 8]);

    expect(apiMessagePost).toHaveBeenCalledWith('/plugin', expect.any(FormData));
    const payload = apiMessagePost.mock.calls[0]?.[1] as FormData;
    expect(payload.get('name')).toBe(' smtp ');
    const jarPayload = payload.get('jarFile');
    expect(jarPayload).toBeInstanceOf(Blob);
    expect((jarPayload as Blob).type).toBe('application/java-archive');
    expect((jarPayload as Blob & { name?: string }).name).toBe('plugin.jar');
    expect(payload.get('enableStatus')).toBe('true');
    expect(apiMessagePut).toHaveBeenCalledWith('/plugin', {
      id: 7,
      name: 'smtp',
      enableStatus: false
    });
    expect(apiMessageDelete).toHaveBeenCalledWith('/plugin?ids=7');
    expect(apiMessageDelete).toHaveBeenCalledWith('/plugin?ids=7&ids=8');
  });

  it('clamps the plugin page index after deletes like the Angular updatePageIndex helper', () => {
    expect(clampPluginPageIndexAfterDelete({ pageIndex: 3, pageSize: 8, totalElements: 17, deleteCount: 2 })).toBe(1);
    expect(clampPluginPageIndexAfterDelete({ pageIndex: 2, pageSize: 8, totalElements: 17, deleteCount: 1 })).toBe(1);
    expect(clampPluginPageIndexAfterDelete({ pageIndex: 1, pageSize: 8, totalElements: 1, deleteCount: 1 })).toBe(0);
  });

  it('validates plugin upload drafts and builds Angular FormData payloads', () => {
    const jarFile = new Blob(['plugin'], { type: 'application/java-archive' });

    expect(validatePluginUploadDraft({ name: '', jarFileName: '', jarFile: null, enableStatus: true })).toEqual({
      name: false,
      jarFile: false
    });
    expect(validatePluginUploadDraft({ name: '   ', jarFileName: 'plugin.jar', jarFile, enableStatus: true })).toEqual({
      name: true,
      jarFile: true
    });
    expect(validatePluginUploadDraft({ name: 'smtp', jarFileName: 'plugin.jar', jarFile, enableStatus: false })).toEqual({
      name: true,
      jarFile: true
    });

    const formData = buildPluginUploadFormData({ name: ' smtp ', jarFileName: 'plugin.jar', jarFile, enableStatus: false });
    expect(formData.get('name')).toBe(' smtp ');
    const jarPayload = formData.get('jarFile');
    expect(jarPayload).toBeInstanceOf(Blob);
    expect((jarPayload as Blob).type).toBe('application/java-archive');
    expect((jarPayload as Blob & { name?: string }).name).toBe('plugin.jar');
    expect(formData.get('enableStatus')).toBe('false');
  });

  it('loads, maps, edits, and saves plugin params like the Angular param define modal', async () => {
    const endpointLabel = String.fromCodePoint(0x7aef, 0x70b9);
    const apiMessageGet = vi.fn().mockResolvedValue({
      paramDefines: [
        { field: 'endpoint', type: 'text', name: { 'zh-CN': endpointLabel, 'en-US': 'Endpoint' }, required: true },
        { field: 'timeout', type: 'number', name: { 'en-US': 'Timeout' } },
        { field: 'payload', type: 'json', name: 'Payload' },
        { field: 'secret', type: 'password', name: 'Secret' }
      ],
      pluginParams: [
        { field: 'endpoint', paramValue: 'https://hooks.example' },
        { field: 'timeout', paramValue: 30 }
      ]
    });
    const apiMessagePost = vi.fn().mockResolvedValue('saved');
    const plugin = { id: 7, name: 'webhook', enableStatus: true } as any;

    expect(buildPluginParamDefineUrl(7)).toBe('/plugin/params/define?pluginMetadataId=7');

    const draft = await loadPluginParamDraft(apiMessageGet as any, plugin, 'zh-CN');
    expect(apiMessageGet).toHaveBeenCalledWith('/plugin/params/define?pluginMetadataId=7');
    expect(draft.paramDefines.map(define => define.name)).toEqual([endpointLabel, 'Timeout', 'Payload', 'Secret']);
    expect(draft.params).toEqual({
      endpoint: { pluginMetadataId: 7, type: 1, field: 'endpoint', paramValue: 'https://hooks.example' },
      timeout: { pluginMetadataId: 7, type: 0, field: 'timeout', paramValue: 30 },
      payload: { pluginMetadataId: 7, type: 3, field: 'payload', paramValue: null },
      secret: { pluginMetadataId: 7, type: 2, field: 'secret', paramValue: null }
    });

    const updated = updatePluginParamDraft(draft, 'timeout', 45);
    expect(updated.params.timeout.paramValue).toBe(45);

    await savePluginParams(apiMessagePost as any, updated.params);
    expect(apiMessagePost).toHaveBeenCalledWith('/plugin/params', [
      { pluginMetadataId: 7, type: 1, field: 'endpoint', paramValue: 'https://hooks.example' },
      { pluginMetadataId: 7, type: 0, field: 'timeout', paramValue: 45 },
      { pluginMetadataId: 7, type: 3, field: 'payload', paramValue: null },
      { pluginMetadataId: 7, type: 2, field: 'secret', paramValue: null }
    ]);
  });

  it('builds a plugin param draft from sparse API data', () => {
    const draft = buildPluginParamDraft(
      { id: 9, name: 'empty', enableStatus: true } as any,
      {
        paramDefines: [{ field: 'token', type: 'string', name: { 'en-US': 'Token' } }]
      },
      'fr-FR'
    );

    expect(draft.paramDefines[0].name).toBe('Token');
    expect(draft.params.token).toEqual({
      pluginMetadataId: 9,
      type: 1,
      field: 'token',
      paramValue: null
    });
  });

  it('keeps an Angular-compatible empty param modal draft when the API has no paramDefines', () => {
    const draft = buildPluginParamDraft(
      { id: 10, name: 'empty-param-plugin', enableStatus: true } as any,
      {
        paramDefines: [],
        pluginParams: []
      },
      'zh-CN'
    );

    expect(draft).toEqual({
      plugin: { id: 10, name: 'empty-param-plugin', enableStatus: true },
      paramDefines: [],
      params: {}
    });
  });
});
