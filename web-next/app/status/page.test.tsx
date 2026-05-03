import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const loadState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>)
}));

const apiMessageGet = vi.fn();
const loadStatusPageData = vi.fn(async () => ({
  org: {
    name: 'Codex Demo Status',
    description: 'Seeded public status data for local verification.',
    state: 1,
    home: 'https://hertzbeat.apache.org',
    feedback: 'ops@hertzbeat.apache.org',
    logo: 'https://hertzbeat.apache.org/logo.svg',
    color: '#0f172a',
    gmtUpdate: 1712730000000
  },
  components: [
    {
      id: 1,
      name: 'Codex Demo API',
      description: 'Primary public API surface.',
      status: 0,
      latestTime: 1712730000000,
      history: []
    }
  ],
  incidents: [
    {
      id: 1,
      title: 'Codex Demo Incident Current',
      state: 2,
      startTime: 1712720000000,
      updateTime: 1712730000000,
      contents: [{ message: 'Investigating', state: 0, timestamp: 1712720000000 }]
    }
  ]
}));

vi.mock('../../components/providers/i18n-provider', async () => {
  const actual = await import('../../lib/i18n');
  return {
    useI18n: () => ({
      t: createTranslatorMock(),
      locale: 'en-US',
      locales: actual.LOCALES,
      setLocale: vi.fn(async () => {})
    })
  };
});

vi.mock('../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({ children, load }: { children: (data: any) => React.ReactNode; load: () => Promise<unknown> }) => {
    loadState.lastLoad = load;
    return (
      <div data-client-workbench="true">
        {children({
          org: {
            name: 'Codex Demo Status',
            description: 'Seeded public status data for local verification.',
            state: 1,
            home: 'https://hertzbeat.apache.org',
            feedback: 'ops@hertzbeat.apache.org',
            logo: 'https://hertzbeat.apache.org/logo.svg',
            color: '#0f172a',
            gmtUpdate: 1712730000000
          },
          components: [
            {
              id: 1,
              name: 'Codex Demo API',
              description: 'Primary public API surface.',
              status: 0,
              latestTime: 1712730000000,
              history: []
            }
          ],
          incidents: [
            {
              id: 1,
              title: 'Codex Demo Incident Current',
              state: 2,
              startTime: 1712720000000,
              updateTime: 1712730000000,
              contents: [{ message: 'Investigating', state: 0, timestamp: 1712720000000 }]
            }
          ]
        })}
      </div>
    );
  }
}));

vi.mock('../../components/pages/public-status-shell', () => ({
  PublicStatusShell: ({ brand, mode, poweredByLabel, componentCards, incidentCards, refreshLabel }: any) => (
    <main data-public-status-shell="true" data-public-status-mode={mode}>
      <span>{brand.title}</span>
      <span>{brand.copy}</span>
      <span>{poweredByLabel}</span>
      <span>{refreshLabel}</span>
      <span>{componentCards.length}</span>
      <span>{incidentCards.length}</span>
      <button type="button">Refresh</button>
    </main>
  )
}));

vi.mock('../../lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('../../lib/status-center/controller', () => ({
  loadStatusPageData,
  loadStatusPageIncidentFeed: vi.fn(async () => [])
}));

vi.mock('../../lib/format', () => ({
  formatTime: () => '2026-04-16 22:00:00'
}));

describe('status page', () => {
  it('renders the shared public status shell and keeps the controller-backed load path', async () => {
    loadStatusPageData.mockClear();
    apiMessageGet.mockReset();
    loadState.lastLoad = null;

    const { default: StatusPage } = await import('./page');
    const html = renderToStaticMarkup(<StatusPage />);
    const lastLoad = loadState.lastLoad as (() => Promise<unknown>) | null;
    await lastLoad?.();

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-public-status-shell="true"');
    expect(html).toContain('data-public-status-mode="component"');
    expect(html).toContain('Codex Demo Status');
    expect(html).toContain('Power by Apache HertzBeat™. Star Us !');
    expect(html).toContain('Refresh');
    expect(loadStatusPageData).toHaveBeenCalledWith(apiMessageGet);
  }, 15000);
});
