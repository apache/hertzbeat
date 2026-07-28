/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { EntityDefinitionViewModel } from '../model/entity-definition-model';
import { EntityDefinitionView } from './entity-definition-view';

const resource = {
  entity: { id: 7, type: 'service', name: 'checkout', owner: 'sre' },
  identities: null,
  monitorBinds: null,
  relations: null
};

describe('EntityDefinitionView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('shows a compact advanced editor, zero-write preview, and progressive technical details', () => {
    const save = vi.fn();
    renderView(
      {
        evidence: { kind: 'ready', resource },
        content: 'kind: service',
        preview: resource,
        dirty: true,
        saveEnabled: true
      },
      { save }
    );
    expect(screen.getByRole('heading', { name: 'Resource definition' })).toBeInTheDocument();
    expect(screen.getByLabelText('Definition content')).toHaveValue('kind: service');
    expect(screen.getByText('checkout')).toBeInTheDocument();
    expect(screen.queryByText(/sre/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Technical details/ }));
    expect(screen.getByText('Owner: sre')).toBeInTheDocument();
    const previewAction = screen.getByRole('button', { name: 'Preview changes' });
    const saveAction = screen.getByRole('button', { name: 'Save definition' });
    expect(previewAction).not.toHaveClass('ant-btn-primary');
    expect(saveAction).toHaveClass('ant-btn-primary');
    fireEvent.click(saveAction);
    expect(save).toHaveBeenCalledOnce();
  });

  it('keeps load states distinct and gives retry without exposing content', () => {
    const retry = vi.fn();
    const { rerender } = renderView({ evidence: { kind: 'permission' } }, { retry });
    expect(screen.getByText('You do not have permission to view this resource definition.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(view({ evidence: { kind: 'missing' } }));
    expect(screen.getByText('Resource definition not found.')).toBeInTheDocument();
  });

  it('disables format/back/edit/reset during irreversible save and explains dirty format guard', () => {
    renderView({
      evidence: { kind: 'ready', resource },
      content: 'changed',
      dirty: true,
      saving: true
    });
    expect(screen.getByText('Reset your changes before switching format.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Definition format' })).toBeDisabled();
    expect(screen.getByLabelText('Definition content')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back to resource' })).toBeDisabled();
  });

  it('offers retry on a committed definition refresh failure', () => {
    const retry = vi.fn();
    renderView(
      {
        evidence: { kind: 'ready', resource },
        content: 'kind: database',
        refreshFailure: { kind: 'unavailable' },
        saved: true
      },
      { retry }
    );
    expect(
      screen.getByText('The definition was saved, but the current version is temporarily unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Definition content')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

function renderView(
  statePatch: Partial<EntityDefinitionViewModel['state']>,
  actionsPatch: Partial<EntityDefinitionViewModel['actions']> = {}
) {
  return render(view(statePatch, actionsPatch));
}

function view(
  statePatch: Partial<EntityDefinitionViewModel['state']>,
  actionsPatch: Partial<EntityDefinitionViewModel['actions']> = {}
) {
  const model: EntityDefinitionViewModel = {
    state: {
      evidence: { kind: 'loading' },
      format: 'yaml',
      content: '',
      dirty: false,
      previewing: false,
      saving: false,
      refreshing: false,
      saveEnabled: false,
      canWrite: true,
      saved: false,
      ...statePatch
    },
    actions: {
      changeContent: () => undefined,
      changeFormat: () => undefined,
      reset: () => undefined,
      preview: () => undefined,
      save: () => undefined,
      retry: () => undefined,
      back: () => undefined,
      ...actionsPatch
    }
  };
  return (
    <I18nextProvider i18n={i18n}>
      <EntityDefinitionView {...model} />
    </I18nextProvider>
  );
}
