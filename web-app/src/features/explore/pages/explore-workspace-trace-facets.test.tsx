/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import type { ComponentProps, ReactNode } from 'react';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { draftFromQuery } from '../model/explore-submission-model';
import { ExploreWorkspaceTraceFacets } from './explore-workspace-trace-facets';
vi.mock('../components/explore-trace-facets', () => ({
  ExploreTraceFacets: ({ controls }: { controls: ReactNode }) => controls
}));
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
type Props = ComponentProps<typeof ExploreWorkspaceTraceFacets>;
// Partial controller fixtures isolate the mutation gate; native smoke exercises the real controller and API contracts.
it.each(['empty', 'ready'])('allows removing a current group from successful %s evidence', kind => {
  const query = {
    signal: 'traces' as const,
    timeRange: 'last-30m' as const,
    resourceFilter: 'service.name IN ("absent")'
  };
  const updateField = vi.fn();
  const controller = {
    query,
    submission: { draft: draftFromQuery(query), updateField },
    result: { kind }
  } as unknown as Props['controller'];
  const analytics = {
    field: 'serviceName',
    facetSelection: { mode: () => 'include', onModeChange: vi.fn() },
    facets: { state: 'ready' },
    onFieldChange: vi.fn()
  } as unknown as Props['analytics'];
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreWorkspaceTraceFacets controller={controller} analytics={analytics} />
    </I18nextProvider>
  );
  const button = screen.getByRole('button', { name: 'Clear Service group' });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(updateField).toHaveBeenCalledWith({ field: 'resourceFilter', value: '' });
});
it.each(['loading', 'permission', 'invalid', 'stale_error', 'refreshing'])(
  'protects group mutation while evidence is %s',
  kind => {
    const query = {
      signal: 'traces' as const,
      timeRange: 'last-30m' as const,
      resourceFilter: 'service.name IN ("a")'
    };
    const updateField = vi.fn();
    const controller = {
      query,
      submission: { draft: draftFromQuery(query), updateField },
      result: { kind }
    } as unknown as Props['controller'];
    const analytics = {
      field: 'serviceName',
      facetSelection: { mode: () => 'include', onModeChange: vi.fn() },
      facets: { state: 'ready' },
      onFieldChange: vi.fn()
    } as unknown as Props['analytics'];
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreWorkspaceTraceFacets controller={controller} analytics={analytics} />
      </I18nextProvider>
    );
    expect(screen.getByRole('button', { name: 'Clear Service group' })).toBeDisabled();
    expect(updateField).not.toHaveBeenCalled();
  }
);
