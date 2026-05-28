import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('alerts alias route', () => {
  it('redirects alerts compatibility traffic to the main alert workbench', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: AlertsAliasPage } = await import('./page');

    await expect(AlertsAliasPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/alert');
    expect(redirect).toHaveBeenCalledWith('/alert');
  }, 20000);

  it('preserves alert filters and machine context while stripping display-only labels', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: AlertsAliasPage } = await import('./page');

    await expect(
      AlertsAliasPage({
        searchParams: Promise.resolve({
          content: ' checkout ',
          status: 'ACKNOWLEDGED',
          severity: 'Warning',
          entityId: '42',
          entityName: 'Checkout API',
          returnTo: '/entities/42?returnLabel=Checkout',
          returnLabel: 'Checkout',
          signal: 'logs'
        })
      })
    ).rejects.toThrow(
      'redirect:/alert?search=checkout&status=acknowledged&severity=warning&entityId=42&entityName=Checkout+API&returnTo=%2Fentities%2F42&signal=logs'
    );
    expect(redirect).toHaveBeenLastCalledWith(
      '/alert?search=checkout&status=acknowledged&severity=warning&entityId=42&entityName=Checkout+API&returnTo=%2Fentities%2F42&signal=logs'
    );
  }, 20000);
});
