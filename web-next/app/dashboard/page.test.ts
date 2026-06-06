import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect
}));

describe('dashboard alias route', () => {
  it('redirects dashboard compatibility traffic to the overview workbench', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: DashboardAliasPage } = await import('./page');

    await expect(DashboardAliasPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/overview');
    expect(redirect).toHaveBeenCalledWith('/overview');
  });

  it('preserves machine route context and strips display labels when redirecting dashboard aliases', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: DashboardAliasPage } = await import('./page');

    await expect(
      DashboardAliasPage({
        searchParams: Promise.resolve({
          start: '10',
          end: '20',
          entityId: '7',
          entityName: 'checkout',
          returnTo: '/monitors?returnLabel=Monitors',
          returnLabel: 'Monitors',
          serviceName: 'checkout',
          environment: ['prod', 'staging']
        })
      })
    ).rejects.toThrow(
      'redirect:/overview?start=10&end=20&entityId=7&entityName=checkout&returnTo=%2Fmonitors&serviceName=checkout&environment=prod'
    );
    expect(redirect).toHaveBeenLastCalledWith(
      '/overview?start=10&end=20&entityId=7&entityName=checkout&returnTo=%2Fmonitors&serviceName=checkout&environment=prod'
    );
  });

  it('preserves dashboard add-panel intent while redirecting to overview', async () => {
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: DashboardAliasPage } = await import('./page');

    await expect(
      DashboardAliasPage({
        searchParams: Promise.resolve({
          intent: 'add-panel',
          signal: 'metrics',
          panelTitle: 'checkout latency',
          entityId: '7',
          serviceName: 'checkout',
          timeRange: 'last-1h',
          source: 'otlp'
        })
      })
    ).rejects.toThrow(
      'redirect:/overview?intent=add-panel&signal=metrics&panelTitle=checkout+latency&entityId=7&serviceName=checkout&timeRange=last-1h&source=otlp'
    );
    expect(redirect).toHaveBeenLastCalledWith(
      '/overview?intent=add-panel&signal=metrics&panelTitle=checkout+latency&entityId=7&serviceName=checkout&timeRange=last-1h&source=otlp'
    );
  });
});
