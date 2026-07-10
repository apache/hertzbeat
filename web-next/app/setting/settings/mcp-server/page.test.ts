import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('setting MCP server alias route', () => {
  it('redirects legacy MCP settings traffic to the config page', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: SettingMcpServerAliasPage } = await import('./page');

    await expect(SettingMcpServerAliasPage({})).rejects.toThrow('redirect:/setting/settings/config?focus=mcp');
    expect(redirect).toHaveBeenCalledWith('/setting/settings/config?focus=mcp');
  });

  it('preserves incoming query context when redirecting legacy MCP settings traffic', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: SettingMcpServerAliasPage } = await import('./page');

    await expect(
      SettingMcpServerAliasPage({
        searchParams: Promise.resolve({
          focus: 'mcp',
          returnTo: '/setting/settings/token',
          mode: 'audit'
        })
      })
    ).rejects.toThrow('redirect:/setting/settings/config?focus=mcp&returnTo=%2Fsetting%2Fsettings%2Ftoken&mode=audit');
    expect(redirect).toHaveBeenLastCalledWith(
      '/setting/settings/config?focus=mcp&returnTo=%2Fsetting%2Fsettings%2Ftoken&mode=audit'
    );
  });
});
