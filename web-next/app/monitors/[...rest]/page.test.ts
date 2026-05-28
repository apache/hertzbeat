import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('monitors catch-all route', () => {
  it('redirects unknown nested monitor paths back to the monitor list', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: MonitorUnknownRoutePage } = await import('./page');

    await expect(MonitorUnknownRoutePage()).rejects.toThrow('redirect:/monitors');
    expect(redirect).toHaveBeenCalledWith('/monitors');
  });

  it('preserves monitor list query context when redirecting unknown nested paths', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: MonitorUnknownRoutePage } = await import('./page');

    await expect(
      MonitorUnknownRoutePage({
        searchParams: Promise.resolve({
          app: 'website',
          labels: 'team=platform',
          entityId: '42',
          returnTo: '/entities/42?returnLabel=Checkout',
          start: '1700000000000'
        })
      })
    ).rejects.toThrow(
      'redirect:/monitors?app=website&labels=team%3Dplatform&entityId=42&returnTo=%2Fentities%2F42&start=1700000000000'
    );
    expect(redirect).toHaveBeenLastCalledWith(
      '/monitors?app=website&labels=team%3Dplatform&entityId=42&returnTo=%2Fentities%2F42&start=1700000000000'
    );
  });
});
