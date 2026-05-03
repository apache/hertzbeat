import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('monitors not-found boundary', () => {
  it('redirects unknown nested monitor paths back to the monitors list', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: MonitorsNotFound } = await import('./not-found');

    expect(() => MonitorsNotFound()).toThrow('redirect:/monitors');
    expect(redirect).toHaveBeenCalledWith('/monitors');
  });
});
