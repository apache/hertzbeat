/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { emptyEntityEditorDraft } from '../model/entity-editor-model';
import { EntityEditorView, type EntityEditorViewProps } from './entity-editor-view';

describe('EntityEditorView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it.each(['loading', 'missing', 'unavailable', 'error'] as const)('keeps %s distinct from the editable form', kind => {
    renderView({ evidence: { kind } });
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-page]')).toHaveAttribute('data-mode', 'form');
    expect(document.querySelector('.ant-empty-image')).not.toBeInTheDocument();
  });

  it('keeps the first viewport focused and explains server-derived identity', () => {
    renderView();
    expect(screen.getByRole('heading', { name: 'Add resource' })).toBeInTheDocument();
    expect(screen.getByText(/automatically recognizes and links/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Resource type' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-form-actions]')).toBeInTheDocument();
    expect(screen.queryByLabelText('Owner')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced details' }));
    expect(screen.getByRole('combobox', { name: 'Owner' })).toBeInTheDocument();
  });

  it('uses backend suggestions without blocking the form when they are unavailable', () => {
    renderView({ suggestions: { kind: 'unavailable' } });
    expect(screen.getByRole('combobox', { name: 'Namespace' })).toBeEnabled();
    expect(screen.getByText('Suggestions are unavailable. You can still enter values.')).toBeInTheDocument();
  });

  it('passes dirty state to cancel and surfaces safe validation and permission failures', () => {
    const cancel = vi.fn();
    const change = vi.fn();
    const { rerender } = renderView({}, { cancel, change });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'checkout' } });
    expect(change).toHaveBeenCalledWith('name', 'checkout');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalledWith();

    rerender(view({ errors: { name: 'required' }, saveFailure: 'permission' }, { cancel, change }));
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('You do not have permission to save this resource.')).toBeInTheDocument();
  });

  it('disables the complete form while a submitted snapshot is saving', () => {
    renderView({ saving: true });

    expect(screen.getByRole('combobox', { name: 'Resource type' })).toBeDisabled();
    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Advanced details' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('renders write-route permission without exposing an editable form', () => {
    renderView({ evidence: { kind: 'permission' } });
    expect(screen.getByText('You do not have permission to save this resource.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });
});

function renderView(
  statePatch: Partial<EntityEditorViewProps['state']> = {},
  actionsPatch: Partial<EntityEditorViewProps['actions']> = {}
) {
  return render(view(statePatch, actionsPatch));
}

function view(
  statePatch: Partial<EntityEditorViewProps['state']> = {},
  actionsPatch: Partial<EntityEditorViewProps['actions']> = {}
) {
  return (
    <I18nextProvider i18n={i18n}>
      <EntityEditorView
        state={{
          mode: 'new',
          evidence: { kind: 'ready' },
          suggestions: { kind: 'ready', value: undefined },
          draft: emptyEntityEditorDraft,
          dirty: false,
          errors: {},
          saving: false,
          ...statePatch
        }}
        actions={{ change: () => undefined, submit: () => undefined, cancel: () => undefined, ...actionsPatch }}
      />
    </I18nextProvider>
  );
}
