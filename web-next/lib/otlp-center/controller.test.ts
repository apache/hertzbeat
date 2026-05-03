import { describe, expect, it, vi } from 'vitest';
import { loadOtlpPageData } from './controller';

describe('otlp center controller', () => {
  it('loads overview, guide and bindings together', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ activeSignalCount: 1 })
      .mockResolvedValueOnce({ signals: [] })
      .mockResolvedValueOnce({ recentBoundEntities: [] });

    const result = await loadOtlpPageData(apiGet as any);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/ingestion/otlp/overview');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/ingestion/otlp/guide');
    expect(apiGet).toHaveBeenNthCalledWith(3, '/ingestion/otlp/bindings');
    expect(result).toEqual({
      overview: { activeSignalCount: 1 },
      guide: { signals: [] },
      bindings: { recentBoundEntities: [] }
    });
  });

  it('does not synthesize a zero-signal overview when the real overview endpoint is unavailable', async () => {
    const apiGet = vi.fn().mockRejectedValue(new Error('API request failed: 404'));

    await expect(loadOtlpPageData(apiGet as any)).rejects.toThrow('404');

    expect(apiGet).toHaveBeenNthCalledWith(1, '/ingestion/otlp/overview');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/ingestion/otlp/guide');
    expect(apiGet).toHaveBeenNthCalledWith(3, '/ingestion/otlp/bindings');
  });

  it('keeps static guide and empty binding hints optional after the real overview loads', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ activeSignalCount: 2 })
      .mockRejectedValueOnce(new Error('API request failed: 404'))
      .mockRejectedValueOnce(new Error('API request failed: 404'));

    const result = await loadOtlpPageData(apiGet as any);

    expect(result.overview).toEqual({ activeSignalCount: 2 });
    expect(result.guide.signals.map(signal => signal.signal)).toEqual(['metrics', 'logs', 'traces']);
    expect(result.bindings).toMatchObject({
      canonicalIdentityKeys: ['service.name', 'service.namespace', 'deployment.environment'],
      recentBoundEntities: [],
      recentIdentitySamples: []
    });
  });
});
