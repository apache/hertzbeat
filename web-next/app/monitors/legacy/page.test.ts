import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('legacy monitors route', () => {
  it('redirects the obsolete single-segment route to the monitor list with query context', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: LegacyMonitorsPage } = await import('./page');

    await expect(
      LegacyMonitorsPage({
        searchParams: Promise.resolve({
          search: 'checkout',
          source: 'product-design-audit'
        })
      })
    ).rejects.toThrow(
      'redirect:/monitors?search=checkout&source=product-design-audit'
    );
    expect(redirect).toHaveBeenCalledWith(
      '/monitors?search=checkout&source=product-design-audit'
    );
  });
});
