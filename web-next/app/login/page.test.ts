import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('login alias route', () => {
  it('redirects login compatibility traffic to the passport login workbench', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: LoginAliasPage } = await import('./page');

    await expect(LoginAliasPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/passport/login');
    expect(redirect).toHaveBeenCalledWith('/passport/login');
  });

  it('preserves the post-auth redirect context when the passport alias is used', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: LoginAliasPage } = await import('./page');

    await expect(
      LoginAliasPage({
        searchParams: Promise.resolve({ redirect: '/monitors?app=website', source: 'guard' })
      })
    ).rejects.toThrow('redirect:/passport/login?redirect=%2Fmonitors%3Fapp%3Dwebsite&source=guard');
    expect(redirect).toHaveBeenLastCalledWith('/passport/login?redirect=%2Fmonitors%3Fapp%3Dwebsite&source=guard');
  });
});
