import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('setting index route', () => {
  it('redirects the root setting route directly to the HertzBeat system config console entrypoint', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: SettingIndexPage } = await import('./page');

    await expect(SettingIndexPage()).rejects.toThrow('redirect:/setting/settings/config');
    expect(redirect).toHaveBeenCalledWith('/setting/settings/config');
  });

  it('routes token query context directly to the token settings page', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: SettingIndexPage } = await import('./page');

    await expect(
      SettingIndexPage({
        searchParams: Promise.resolve({
          tab: 'token',
          mode: 'audit',
          returnTo: '/entities/7'
        })
      })
    ).rejects.toThrow('redirect:/setting/settings/token?tab=token&mode=audit&returnTo=%2Fentities%2F7');
    expect(redirect).toHaveBeenLastCalledWith('/setting/settings/token?tab=token&mode=audit&returnTo=%2Fentities%2F7');
  });
});
