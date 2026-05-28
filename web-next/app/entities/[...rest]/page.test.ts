import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('entities catch-all route', () => {
  it('redirects unknown nested entity paths back to the entities list', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: EntityUnknownRoutePage } = await import('./page');

    await expect(EntityUnknownRoutePage()).rejects.toThrow('redirect:/entities');
    expect(redirect).toHaveBeenCalledWith('/entities');
  });

  it('preserves entity catalog query context when redirecting unknown nested paths', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: EntityUnknownRoutePage } = await import('./page');

    await expect(
      EntityUnknownRoutePage({
        searchParams: Promise.resolve({
          search: 'checkout',
          type: 'service',
          status: 'review',
          source: 'otlp',
          returnTo: '/trace/manage?returnLabel=Trace'
        })
      })
    ).rejects.toThrow(
      'redirect:/entities?search=checkout&type=service&status=review&source=otlp&returnTo=%2Ftrace%2Fmanage'
    );
    expect(redirect).toHaveBeenLastCalledWith(
      '/entities?search=checkout&type=service&status=review&source=otlp&returnTo=%2Ftrace%2Fmanage'
    );
  });
});
