import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('log integration source alias route', () => {
  it('redirects the source alias into the HertzBeat OTLP logs intake', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: LogIntegrationSourcePage } = await import('./page');

    await expect(
      LogIntegrationSourcePage({
        params: Promise.resolve({ source: 'webhook' }),
        searchParams: Promise.resolve({})
      })
    ).rejects.toThrow('redirect:/ingestion/otlp?signal=logs');
    expect(redirect).toHaveBeenCalledWith('/ingestion/otlp?signal=logs');
  });

  it('keeps route context and drops source fallback when redirecting a bookmarked source alias', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: LogIntegrationSourcePage } = await import('./page');

    await expect(
      LogIntegrationSourcePage({
        params: Promise.resolve({ source: 'webhook' }),
        searchParams: Promise.resolve({
          traceId: 'trace-123',
          spanId: 'span-456',
          start: '10',
          end: '20',
          entityId: '7',
          entityName: 'Checkout API',
          returnTo: '/overview',
          returnLabel: 'Overview',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          environment: 'prod'
        })
      })
    ).rejects.toThrow(
      'redirect:/ingestion/otlp?signal=logs&start=10&end=20&entityId=7&entityName=Checkout+API&returnTo=%2Foverview&serviceName=checkout&serviceNamespace=payments&environment=prod&traceId=trace-123&spanId=span-456'
    );
    expect(redirect).toHaveBeenLastCalledWith(
      '/ingestion/otlp?signal=logs&start=10&end=20&entityId=7&entityName=Checkout+API&returnTo=%2Foverview&serviceName=checkout&serviceNamespace=payments&environment=prod&traceId=trace-123&spanId=span-456'
    );
  });

  it('drops explicit log search filters because this alias is intake navigation', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: LogIntegrationSourcePage } = await import('./page');

    await expect(
      LogIntegrationSourcePage({
        params: Promise.resolve({ source: 'webhook' }),
        searchParams: Promise.resolve({
          search: 'payments',
          traceId: 'trace-123'
        })
      })
    ).rejects.toThrow('redirect:/ingestion/otlp?signal=logs&traceId=trace-123');
    expect(redirect).toHaveBeenLastCalledWith('/ingestion/otlp?signal=logs&traceId=trace-123');
  });
});
