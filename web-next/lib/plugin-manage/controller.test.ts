import { describe, expect, it, vi } from 'vitest';
import { createEmptyPluginDraft, deletePlugin, loadPluginData, savePlugin, togglePluginStatus } from './controller';

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
      enableStatus: true
    });
  });

  it('routes plugin save, status toggle, and delete requests through the expected endpoints', async () => {
    const apiMessagePost = vi.fn().mockResolvedValue('created');
    const apiMessagePut = vi.fn().mockResolvedValue('updated');
    const apiMessageDelete = vi.fn().mockResolvedValue('deleted');

    await savePlugin(apiMessagePost as any, { name: ' smtp ', jarFileName: 'plugin.jar', enableStatus: true });
    await togglePluginStatus(apiMessagePut as any, { id: 7, name: 'smtp', enableStatus: true } as any);
    await deletePlugin(apiMessageDelete as any, 7);

    expect(apiMessagePost).toHaveBeenCalledWith('/plugin', {
      name: 'smtp',
      jarFileName: 'plugin.jar',
      enableStatus: true
    });
    expect(apiMessagePut).toHaveBeenCalledWith('/plugin', {
      id: 7,
      name: 'smtp',
      enableStatus: false
    });
    expect(apiMessageDelete).toHaveBeenCalledWith('/plugin?ids=7');
  });
});
