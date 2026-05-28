import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('events alias route', () => {
  beforeEach(() => {
    redirect.mockReset();
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });
  });

  it('redirects events compatibility traffic to the canonical log explorer view', async () => {
    const { default: EventsAliasPage } = await import('./page');

    await expect(EventsAliasPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/log/manage?view=list');
    expect(redirect).toHaveBeenCalledWith('/log/manage?view=list');
  }, 20000);

  it('preserves log filters and machine context while stripping display-only labels', async () => {
    const { default: EventsAliasPage } = await import('./page');

    await expect(
      EventsAliasPage({
        searchParams: Promise.resolve({
          content: ' checkout timeout ',
          traceId: ' trace-123 ',
          severityNumber: '17',
          start: '10',
          end: '20',
          entityId: '7',
          entityName: 'Checkout API',
          returnTo: '/overview?returnLabel=Overview',
          returnLabel: 'Overview',
          serviceName: 'checkout',
          environment: ['prod', 'staging']
        })
      })
    ).rejects.toThrow(
      'redirect:/log/manage?search=checkout+timeout&traceId=trace-123&severityNumber=17&view=list&start=10&end=20&entityId=7&entityName=Checkout+API&returnTo=%2Foverview&serviceName=checkout&environment=prod'
    );
    expect(redirect).toHaveBeenLastCalledWith(
      '/log/manage?search=checkout+timeout&traceId=trace-123&severityNumber=17&view=list&start=10&end=20&entityId=7&entityName=Checkout+API&returnTo=%2Foverview&serviceName=checkout&environment=prod'
    );
  }, 20000);
});
