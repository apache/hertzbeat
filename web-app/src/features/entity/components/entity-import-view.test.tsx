/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { initialEntityImportDraft, type EntityImportViewModel } from '../model/entity-import-model';
import { EntityImportView } from './entity-import-view';

const preview = [
  { entity: { type: 'service', name: 'checkout', owner: 'sre' }, identities: [], monitorBinds: [], relations: [] },
  { entity: { type: 'database', name: 'orders-db' }, identities: [], monitorBinds: [], relations: [] }
];

describe('EntityImportView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('presents paste, zero-write preview, explicit confirmation, and progressive technical details', () => {
    const actions = { changeContent: vi.fn(), preview: vi.fn(), confirm: vi.fn() };
    renderView(
      { draft: { content: 'kind: service', format: 'yaml', preview }, preview, confirmEnabled: true },
      actions
    );
    expect(screen.getByRole('heading', { name: 'Import resource definitions' })).toBeInTheDocument();
    expect(screen.getByLabelText('Resource definition content')).toBeInTheDocument();
    expect(screen.getByText('checkout')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.queryByText('sre')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Technical details/ })[0]!);
    expect(screen.getByText(/sre/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));
    expect(actions.confirm).toHaveBeenCalledOnce();
  });

  it('keeps failure kinds distinct and shows ordered created resource links', () => {
    const { rerender } = renderView({ failure: { kind: 'permission' } });
    expect(screen.getByText('You do not have permission to import resources.')).toBeInTheDocument();
    rerender(view({ failure: { kind: 'validation', message: 'Fix resource type' } }));
    expect(screen.getByText('Fix resource type')).toBeInTheDocument();
    rerender(view({ createdIds: [41, 42], preview }));
    const links = screen.getAllByRole('link').filter(link => /^\/entities\/\d+$/.test(link.getAttribute('href') ?? ''));
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/entities/41', '/entities/42']);
    expect(screen.getByRole('link', { name: 'checkout' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'orders-db' })).toBeInTheDocument();
  });

  it('disables preview for blank input and confirm until the exact preview is ready', () => {
    renderView({ draft: initialEntityImportDraft, confirmEnabled: false });
    expect(screen.getByRole('button', { name: 'Preview resources' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm import' })).toBeDisabled();
  });

  it('renders ordered same-name resources without duplicate React row keys', () => {
    const duplicatePreview = [
      { ...preview[0]!, entity: { ...preview[0]!.entity, namespace: 'storefront' } },
      { ...preview[0]!, entity: { ...preview[0]!.entity, namespace: 'backoffice' } }
    ];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderView({ preview: duplicatePreview });
    expect(screen.getAllByText('checkout')).toHaveLength(2);
    expect(consoleError.mock.calls.flat().join(' ')).not.toMatch(/same key|unique "key"/i);
    consoleError.mockRestore();
  });
});

function renderView(
  statePatch: Partial<EntityImportViewModel['state']>,
  actionsPatch: Partial<EntityImportViewModel['actions']> = {}
) {
  return render(view(statePatch, actionsPatch));
}

function view(
  statePatch: Partial<EntityImportViewModel['state']>,
  actionsPatch: Partial<EntityImportViewModel['actions']> = {}
) {
  const model: EntityImportViewModel = {
    state: {
      draft: initialEntityImportDraft,
      previewing: false,
      confirming: false,
      confirmEnabled: false,
      returnTo: '/entities',
      ...statePatch
    },
    actions: {
      changeContent: () => undefined,
      changeFormat: () => undefined,
      preview: () => undefined,
      confirm: () => undefined,
      cancel: () => undefined,
      ...actionsPatch
    }
  };
  return (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <EntityImportView {...model} />
      </MemoryRouter>
    </I18nextProvider>
  );
}
