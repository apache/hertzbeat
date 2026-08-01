/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { defaultEntityDiscoveryQuery, type EntityDiscoveryViewModel } from '../model/entity-discovery-model';
import { EntityDiscoveryView } from './entity-discovery-view';

const rows = [
  {
    monitor: { id: 3, name: 'checkout-http', app: 'website', instance: 'checkout:443', status: 1 },
    candidates: [
      {
        resourceId: 7,
        resourceName: 'checkout',
        resourceType: 'service',
        match: 'already_bound' as const,
        matchedKeys: ['service.name']
      },
      {
        resourceId: 8,
        resourceName: 'checkout-api',
        resourceType: 'api',
        match: 'direct' as const,
        matchedKeys: ['host.name']
      }
    ]
  }
];

describe('EntityDiscoveryView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('shows familiar monitor and candidate language with keys disclosed progressively', () => {
    const openCandidate = vi.fn();
    renderView({ evidence: { kind: 'ready', records: rows, total: 1 } }, { openCandidate });
    expect(screen.getByRole('heading', { name: 'Discover resources' })).toBeInTheDocument();
    expect(screen.getByText('checkout-http')).toBeInTheDocument();
    expect(screen.getByText('website')).toBeInTheDocument();
    expect(screen.getByText('checkout:443')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Already associated')).toBeInTheDocument();
    expect(screen.getByText('High match')).toBeInTheDocument();
    expect(screen.queryByText('service.name')).not.toBeInTheDocument();
    expect(screen.queryByText(/identity|score|already_bound|direct/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Matching evidence')[0]!);
    expect(screen.getByText('service.name')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open resource' }));
    fireEvent.click(screen.getByRole('button', { name: 'View candidate' }));
    expect(openCandidate).toHaveBeenNthCalledWith(1, 7);
    expect(openCandidate).toHaveBeenNthCalledWith(2, 8);
  });

  it('offers an honest add-resource handoff when a monitor has no candidates', () => {
    const create = vi.fn();
    renderView(
      {
        evidence: {
          kind: 'ready',
          records: [{ monitor: rows[0]!.monitor, candidates: [] }],
          total: 1
        }
      },
      { create }
    );
    expect(screen.getByText('No resource candidates found.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add resource' }));
    expect(create).toHaveBeenCalledWith(rows[0]!.monitor);
  });

  it('keeps GUEST discovery results readable without exposing the create action', () => {
    renderView({
      canWrite: false,
      evidence: {
        kind: 'ready',
        records: [{ monitor: rows[0]!.monitor, candidates: [] }],
        total: 1
      }
    });
    expect(screen.getByText('checkout-http')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add resource' })).not.toBeInTheDocument();
  });

  it.each(['loading', 'empty', 'not-found', 'unsupported', 'unavailable', 'error'] as const)(
    'keeps %s distinct from ready rows',
    kind => {
      renderView({ evidence: { kind } });
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      if (kind === 'empty') expect(screen.getByText('No monitors match this search.')).toBeInTheDocument();
      if (kind === 'not-found')
        expect(screen.getByText('Resource discovery endpoint was not found.')).toBeInTheDocument();
      if (kind === 'unsupported')
        expect(screen.getByText('Resource discovery is not supported by this deployment.')).toBeInTheDocument();
    }
  );
});

function renderView(
  statePatch: Partial<EntityDiscoveryViewModel['state']>,
  actionsPatch: Partial<EntityDiscoveryViewModel['actions']> = {}
) {
  const viewModel: EntityDiscoveryViewModel = {
    state: {
      query: defaultEntityDiscoveryQuery,
      draft: '',
      evidence: { kind: 'loading' },
      refreshing: false,
      canWrite: true,
      ...statePatch
    },
    actions: {
      updateDraft: () => undefined,
      submit: () => undefined,
      changePage: () => undefined,
      refresh: () => undefined,
      back: () => undefined,
      create: () => undefined,
      openCandidate: () => undefined,
      ...actionsPatch
    }
  };
  return render(
    <I18nextProvider i18n={i18n}>
      <EntityDiscoveryView {...viewModel} />
    </I18nextProvider>
  );
}
