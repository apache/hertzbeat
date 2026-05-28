import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('root alias route', () => {
  beforeEach(() => {
    redirect.mockReset();
  });

  it('redirects the shell entry point to the overview workbench', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: HomePage } = await import('./page');

    await expect(HomePage({})).rejects.toThrow('redirect:/overview');
    expect(redirect).toHaveBeenCalledWith('/overview');
  });

  it('preserves machine query context when redirecting to overview', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: HomePage } = await import('./page');

    await expect(
      HomePage({
        searchParams: Promise.resolve({
          source: 'shell',
          serviceName: 'checkout',
          returnTo: '/monitors?returnLabel=Legacy',
          returnLabel: 'Overview',
          start: '1700000000000',
          environment: ['prod', 'ignored']
        })
      })
    ).rejects.toThrow('redirect:/overview?');

    const target = redirect.mock.calls[0]?.[0] as string;
    const url = new URL(target, 'http://127.0.0.1');

    expect(url.pathname).toBe('/overview');
    expect(url.searchParams.get('source')).toBe('shell');
    expect(url.searchParams.get('serviceName')).toBe('checkout');
    expect(url.searchParams.get('environment')).toBe('prod');
    expect(url.searchParams.get('returnTo')).toBe('/monitors');
    expect(url.searchParams.get('returnLabel')).toBeNull();
    expect(url.searchParams.get('start')).toBe('1700000000000');
  });
});
