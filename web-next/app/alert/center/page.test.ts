import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('alert center alias route', () => {
  it('redirects alert center compatibility traffic to the main alert workbench', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: AlertCenterAliasPage } = await import('./page');

    await expect(AlertCenterAliasPage()).rejects.toThrow('redirect:/alert');
    expect(redirect).toHaveBeenCalledWith('/alert');
  });

  it('preserves incoming query context when redirecting the alert center alias', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: AlertCenterAliasPage } = await import('./page');

    await expect(
      AlertCenterAliasPage({
        searchParams: Promise.resolve({
          status: 'acknowledged',
          severity: 'warning',
          entityId: '42',
          returnTo: '/entities/42'
        })
      })
    ).rejects.toThrow('redirect:/alert?status=acknowledged&severity=warning&entityId=42&returnTo=%2Fentities%2F42');
    expect(redirect).toHaveBeenLastCalledWith('/alert?status=acknowledged&severity=warning&entityId=42&returnTo=%2Fentities%2F42');
  });

  it('strips display return labels when redirecting alert center aliases', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: AlertCenterAliasPage } = await import('./page');

    await expect(
      AlertCenterAliasPage({
        searchParams: Promise.resolve({
          content: ' checkout ',
          status: 'ACKNOWLEDGED',
          severity: 'Warning',
          entityId: '42',
          entityName: 'Checkout API',
          returnTo: '/entities/42?returnLabel=Checkout',
          returnLabel: 'Checkout'
        })
      })
    ).rejects.toThrow(
      'redirect:/alert?search=checkout&status=acknowledged&severity=warning&entityId=42&entityName=Checkout+API&returnTo=%2Fentities%2F42'
    );
    expect(redirect).toHaveBeenLastCalledWith(
      '/alert?search=checkout&status=acknowledged&severity=warning&entityId=42&entityName=Checkout+API&returnTo=%2Fentities%2F42'
    );
  });
});
