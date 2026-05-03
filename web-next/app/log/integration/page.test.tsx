import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('log integration alias route', () => {
  it('redirects the compatibility integration entrypoint into the HertzBeat OTLP logs intake', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: LogIntegrationPage } = await import('./page');

    await expect(LogIntegrationPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/ingestion/otlp?signal=logs');
    expect(redirect).toHaveBeenCalledWith('/ingestion/otlp?signal=logs');
  });

  it('preserves route context, but drops compatibility log filters, when redirecting integration bookmarks', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: LogIntegrationPage } = await import('./page');

    await expect(
      LogIntegrationPage({
        searchParams: Promise.resolve({
          content: 'webhook',
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
});
