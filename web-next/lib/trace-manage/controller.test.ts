import { describe, expect, it, vi } from 'vitest';
import { loadRelatedLogs, loadTraceDetailBundle } from './controller';

describe('trace controller', () => {
  it('loads detail and spans together for a trace id', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ traceId: 't-1', serviceName: 'checkout' })
      .mockResolvedValueOnce([{ spanId: 's-1', traceId: 't-1' }]);

    const result = await loadTraceDetailBundle(apiGet, 't-1');

    expect(apiGet).toHaveBeenNthCalledWith(1, '/traces/t-1');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/traces/t-1/spans');
    expect(result).toEqual({
      detail: { traceId: 't-1', serviceName: 'checkout' },
      spans: [{ spanId: 's-1', traceId: 't-1' }]
    });
  });

  it('loads related logs for the selected trace id', async () => {
    const apiGet = vi.fn().mockResolvedValue({ content: [{ traceId: 't-1', body: 'log' }] });

    const result = await loadRelatedLogs(apiGet, 't-1');

    expect(apiGet).toHaveBeenCalledWith('/logs/list?pageIndex=0&pageSize=5&traceId=t-1');
    expect(result).toEqual([{ traceId: 't-1', body: 'log' }]);
  });
});
