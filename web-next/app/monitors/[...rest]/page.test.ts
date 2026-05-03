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

    expect(() => MonitorUnknownRoutePage()).toThrow('redirect:/monitors');
    expect(redirect).toHaveBeenCalledWith('/monitors');
  });
});
