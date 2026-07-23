/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { defaultEntityQuery } from '../model/entity-view-model';
import { EntityListView, type EntityListViewProps } from './entity-list-view';

describe('EntityListView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it.each(['loading', 'empty', 'unavailable', 'error'] as const)('keeps %s distinct from ready rows', kind => {
    renderView({ evidence: { kind } });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('uses familiar resource-catalog language instead of exposing the internal domain model', () => {
    renderView({ evidence: { kind: 'empty' } });
    expect(screen.getByRole('heading', { name: 'Resource catalog' })).toBeInTheDocument();
    expect(screen.getByText(/automatically unified/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search resources')).toBeInTheDocument();
    expect(screen.getByText('No resources match the current filters.')).toBeInTheDocument();
  });

  it('keeps secondary filters collapsed by default and preserves their values across disclosure', () => {
    renderView({ query: { ...defaultEntityQuery, owner: 'sre', source: 'manual', tier: 'tier1' } });
    expect(screen.queryByLabelText(i18n.t('entity.filters.owner'))).not.toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('entity.filters.showAdvanced') }));
    expect(screen.getByLabelText(i18n.t('entity.filters.owner'))).toHaveValue('sre');
    expect(screen.getByLabelText(i18n.t('entity.filters.source'))).toHaveValue('manual');
    expect(screen.getByLabelText(i18n.t('entity.filters.tier'))).toHaveValue('tier1');

    fireEvent.click(screen.getByRole('button', { name: i18n.t('entity.filters.hideAdvanced') }));
    expect(screen.queryByLabelText(i18n.t('entity.filters.owner'))).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entity.filters.showAdvanced') }));
    expect(screen.getByLabelText(i18n.t('entity.filters.owner'))).toHaveValue('sre');
  });

  it('opens the selected row from the dense inventory table', () => {
    const open = vi.fn();
    renderView(
      {
        evidence: {
          kind: 'ready',
          records: [
            {
              id: 7,
              type: 'service',
              name: 'checkout',
              environment: 'prod',
              owner: 'sre',
              status: 'degraded',
              identityCount: 1,
              monitorCount: 2,
              relationCount: 1,
              activeAlertCount: 1
            }
          ],
          total: 1
        }
      },
      { open }
    );
    fireEvent.click(screen.getByText('checkout'));
    expect(open).toHaveBeenCalledWith(7);
  });
});

function renderView(
  statePatch: Partial<EntityListViewProps['state']>,
  actionsPatch: Partial<EntityListViewProps['actions']> = {}
) {
  const actions: EntityListViewProps['actions'] = {
    updateDraft: () => undefined,
    submit: () => undefined,
    changeFilter: () => undefined,
    changeSort: () => undefined,
    changePage: () => undefined,
    refresh: () => undefined,
    open: () => undefined,
    ...actionsPatch
  };
  return render(
    <I18nextProvider i18n={i18n}>
      <EntityListView
        state={{
          query: defaultEntityQuery,
          draft: '',
          evidence: { kind: 'loading' },
          refreshing: false,
          ...statePatch
        }}
        actions={actions}
      />
    </I18nextProvider>
  );
}
