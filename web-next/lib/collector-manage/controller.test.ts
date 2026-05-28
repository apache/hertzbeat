import { describe, expect, it, vi } from 'vitest';
import {
  buildCollectorDeleteUrl,
  buildCollectorDeployCommands,
  buildCollectorGenerateIdentityUrl,
  buildCollectorOperateUrl,
  deleteCollectors,
  generateCollectorIdentity,
  goOfflineCollectors,
  goOnlineCollectors,
  loadCollectorData
} from './controller';

describe('collector controller', () => {
  it('loads collector list from the existing endpoint', async () => {
    const apiGet = vi.fn().mockResolvedValue({ content: [], totalElements: 0 });
    const result = await loadCollectorData(apiGet as any, { search: '' });
    expect(apiGet).toHaveBeenCalledWith('/collector?pageIndex=0&pageSize=8');
    expect(result).toEqual({ list: { content: [], totalElements: 0 } });
  });

  it('deletes collectors through the Angular repeated collectors query contract', async () => {
    const apiDelete = vi.fn().mockResolvedValue('deleted');

    expect(buildCollectorDeleteUrl(['edge-a', 'edge-b'])).toBe('/collector?collectors=edge-a&collectors=edge-b');

    await deleteCollectors(apiDelete as any, ['edge-a', 'edge-b']);

    expect(apiDelete).toHaveBeenCalledWith('/collector?collectors=edge-a&collectors=edge-b');
  });

  it('operates collectors through the Angular PUT repeated collectors query contract', async () => {
    const apiPut = vi.fn().mockResolvedValue('operated');

    expect(buildCollectorOperateUrl('online', ['edge-a', 'edge-b'])).toBe('/collector/online?collectors=edge-a&collectors=edge-b');
    expect(buildCollectorOperateUrl('offline', ['edge-a'])).toBe('/collector/offline?collectors=edge-a');

    await goOnlineCollectors(apiPut as any, ['edge-a', 'edge-b']);
    await goOfflineCollectors(apiPut as any, ['edge-a']);

    expect(apiPut).toHaveBeenNthCalledWith(1, '/collector/online?collectors=edge-a&collectors=edge-b', null);
    expect(apiPut).toHaveBeenNthCalledWith(2, '/collector/offline?collectors=edge-a', null);
  });

  it('generates collector identity and deployment commands through the Angular deploy contract', async () => {
    const apiPost = vi.fn().mockResolvedValue({ identity: 'id-123', host: '10.0.0.10' });
    const t = (key: string) => key;

    expect(buildCollectorGenerateIdentityUrl(' edge a ')).toBe('/collector/generate/edge%20a');
    expect(buildCollectorGenerateIdentityUrl('   ')).toBe('/collector/generate/');
    await generateCollectorIdentity(apiPost as any, 'edge-a');

    expect(apiPost).toHaveBeenCalledWith('/collector/generate/edge-a', null);

    const commands = buildCollectorDeployCommands(t, 'id-123', '10.0.0.10');
    expect(commands.dockerShell).toContain('-e IDENTITY=id-123');
    expect(commands.dockerShell).toContain('-e MANAGER_HOST=10.0.0.10');
    expect(commands.packageShell).toContain('identity: id-123');
    expect(commands.packageShell).toContain('manager-host: 10.0.0.10');
    expect(commands.packageShell).toContain('manager-port: 1158');
  });
});
