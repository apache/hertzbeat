import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('setting settings index route', () => {
  it('redirects nested settings traffic to the config page', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: SettingSettingsIndexPage } = await import('./page');

    await expect(SettingSettingsIndexPage()).rejects.toThrow('redirect:/setting/settings/config');
    expect(redirect).toHaveBeenCalledWith('/setting/settings/config');
  });

  it('routes server query context directly to the server settings page', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: SettingSettingsIndexPage } = await import('./page');

    await expect(
      SettingSettingsIndexPage({
        searchParams: Promise.resolve({
          section: 'server',
          focus: 'smtp',
          returnTo: '/alert'
        })
      })
    ).rejects.toThrow('redirect:/setting/settings/server?section=server&focus=smtp&returnTo=%2Falert');
    expect(redirect).toHaveBeenLastCalledWith('/setting/settings/server?section=server&focus=smtp&returnTo=%2Falert');
  });
});
