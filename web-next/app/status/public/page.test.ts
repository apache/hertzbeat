import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('status public alias route', () => {
  it('redirects public status compatibility traffic to the unified status page', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: StatusPublicAliasPage } = await import('./page');

    await expect(StatusPublicAliasPage()).rejects.toThrow('redirect:/status');
    expect(redirect).toHaveBeenCalledWith('/status');
  });

  it('preserves incoming query context when redirecting the public status alias', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: StatusPublicAliasPage } = await import('./page');

    await expect(
      StatusPublicAliasPage({
        searchParams: Promise.resolve({
          component: 'api',
          status: 'down',
          year: '2026',
          returnTo: '/overview'
        })
      })
    ).rejects.toThrow('redirect:/status?component=api&status=down&year=2026&returnTo=%2Foverview');
    expect(redirect).toHaveBeenLastCalledWith('/status?component=api&status=down&year=2026&returnTo=%2Foverview');
  });
});
