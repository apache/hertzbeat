/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { App } from 'antd';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { requireDomElement } from '@/test/dom-element';

const owner = vi.hoisted(() => ({ useController: vi.fn() }));
vi.mock('../controller/use-monitor-definition-controller', () => ({
  useMonitorDefinitionController: owner.useController
}));

import { MonitorDefinitionPage } from './monitor-definition-page';

const revision = 'a'.repeat(64);
const item = { app: 'mysql', label: 'MySQL', origin: 'override', editable: true, deletable: true, revision };

describe('MonitorDefinitionPage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => owner.useController.mockReturnValue(buildController()));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders searchable catalog actions and delegates view/create/edit/delete', () => {
    const controller = buildController();
    owner.useController.mockReturnValue(controller);
    renderPage();

    const page = requireDomElement(document.querySelector('[data-hb-operational-page]'), 'Operational page');
    const header = requireDomElement(
      document.querySelector('[data-hb-operational-page-header]'),
      'Operational page header'
    );
    const headerActions = requireDomElement(
      header.querySelector('[data-hb-operational-page-actions]'),
      'Operational page actions'
    );
    const commandBand = screen.getByRole('search');
    expect(page).toContainElement(header);
    expect(header).toContainElement(screen.getByRole('heading', { name: 'Monitor definitions' }));
    expect(headerActions).toContainElement(screen.getByRole('button', { name: 'Create definition' }));
    expect(header).not.toContainElement(screen.getByRole('button', { name: 'Refresh' }));
    expect(commandBand).toContainElement(screen.getByRole('button', { name: 'Refresh' }));
    expect(commandBand).not.toContainElement(screen.getByRole('button', { name: 'Create definition' }));
    expect(screen.getByText('MySQL')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search definitions'), { target: { value: 'mysql' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create definition' }));
    fireEvent.click(screen.getByRole('button', { name: 'View MySQL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit MySQL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete MySQL' }));

    expect(controller.actions.setSearch).toHaveBeenCalledWith('mysql');
    expect(controller.actions.openCreate).toHaveBeenCalledOnce();
    expect(controller.actions.openView).toHaveBeenCalledWith('mysql');
    expect(controller.actions.openEdit).toHaveBeenCalledWith('mysql');
    expect(controller.actions.requestDelete).toHaveBeenCalledWith(item);
  });

  it('renders editor validation, save, conflict refresh, and cancel actions', () => {
    const controller = buildController({
      workspace: {
        kind: 'edit',
        draft: { mode: 'update', expectedApp: 'mysql', definition: 'app: mysql', revision },
        failure: 'revision-conflict',
        pending: null,
        validation: null,
        writeRecovery: null
      }
    });
    owner.useController.mockReturnValue(controller);
    renderPage();

    fireEvent.change(screen.getByLabelText('Definition YAML'), { target: { value: 'app: mysql\nname: changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh latest definition' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(controller.actions.setDefinition).toHaveBeenCalledWith('app: mysql\nname: changed');
    expect(controller.actions.validate).toHaveBeenCalledOnce();
    expect(controller.actions.save).toHaveBeenCalledOnce();
    expect(controller.actions.refreshAuthoritativeDraft).toHaveBeenCalledOnce();
    expect(controller.actions.closeWorkspace).toHaveBeenCalledOnce();
  });

  it('freezes an uncertain draft and offers only catalog evidence refresh or cancel', () => {
    const controller = buildController({
      workspace: {
        kind: 'edit',
        draft: { mode: 'update', expectedApp: 'mysql', definition: 'app: mysql', revision },
        failure: 'state-uncertain',
        pending: null,
        validation: null,
        writeRecovery: 'uncertain'
      }
    });
    owner.useController.mockReturnValue(controller);
    renderPage();

    expect(screen.getByLabelText('Definition YAML')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Validate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Refresh latest definition' })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Refresh' })[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(controller.actions.retryWorkspaceProof).toHaveBeenCalledOnce();
    expect(controller.actions.closeWorkspace).toHaveBeenCalledOnce();
  });

  it('freezes uncertain delete confirmation and offers only catalog evidence refresh or cancel', () => {
    const controller = buildController({
      deleteFailure: 'unavailable',
      deleteTarget: item,
      deleteWriteRecovery: 'uncertain'
    });
    owner.useController.mockReturnValue(controller);
    renderPage();

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Refresh' })[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(controller.actions.retryDeleteProof).toHaveBeenCalledOnce();
    expect(controller.actions.confirmDelete).not.toHaveBeenCalled();
    expect(controller.actions.cancelDelete).toHaveBeenCalledOnce();
  });

  it('renders localized required evidence for a blank definition draft', () => {
    owner.useController.mockReturnValue(
      buildController({
        workspace: {
          kind: 'edit',
          draft: { mode: 'create', expectedApp: null, definition: '' },
          failure: 'definition-required',
          pending: null,
          validation: null,
          writeRecovery: null
        }
      })
    );
    renderPage();

    expect(screen.getByText('Definition YAML is required.')).toBeInTheDocument();
  });

  it('distinguishes loading, empty, error, read-only permission, and delete disposition states', () => {
    owner.useController.mockReturnValue(buildController({ listState: { kind: 'loading' }, items: [] }));
    const page = renderPage();
    expect(screen.getByLabelText('Loading monitor definitions…')).toBeInTheDocument();

    owner.useController.mockReturnValue(buildController({ listState: { kind: 'empty' }, items: [] }));
    page.rerender(shell(<MonitorDefinitionPage />));
    expect(screen.getByText('No monitor definitions are available.')).toBeInTheDocument();

    owner.useController.mockReturnValue(
      buildController({ listState: { kind: 'error', failure: 'unavailable' }, items: [] })
    );
    page.rerender(shell(<MonitorDefinitionPage />));
    expect(screen.getByText('Monitor definitions are unavailable. Try again.')).toBeInTheDocument();

    owner.useController.mockReturnValue(buildController({ canWrite: false, notice: 'removed' }));
    page.rerender(shell(<MonitorDefinitionPage />));
    expect(screen.getByText('Administrator access is required to change monitor definitions.')).toBeInTheDocument();
    expect(screen.getByText('The custom definition was removed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create definition' })).toBeDisabled();
  });

  it('distinguishes a search miss from a genuinely empty catalog', () => {
    owner.useController.mockReturnValue(
      buildController({ items: [], listState: { kind: 'ready' }, search: 'missing' })
    );
    renderPage();

    expect(screen.getByText('No definitions match the current search.')).toBeInTheDocument();
    expect(screen.queryByText('No monitor definitions are available.')).not.toBeInTheDocument();
  });
});

function buildController(overrides: Record<string, unknown> = {}) {
  return {
    actions: {
      cancelDelete: vi.fn(),
      closeWorkspace: vi.fn(),
      confirmDelete: vi.fn(),
      openCreate: vi.fn(),
      openEdit: vi.fn(),
      openView: vi.fn(),
      refresh: vi.fn(),
      refreshAuthoritativeDraft: vi.fn(),
      retryDeleteProof: vi.fn(),
      retryWorkspaceProof: vi.fn(),
      retryWorkspace: vi.fn(),
      requestDelete: vi.fn(),
      save: vi.fn(),
      setDefinition: vi.fn(),
      setSearch: vi.fn(),
      validate: vi.fn()
    },
    canWrite: true,
    deleteFailure: null,
    deletePending: false,
    deleteTarget: null,
    deleteWriteRecovery: null,
    items: [item],
    listState: { kind: 'ready' },
    notice: null,
    search: '',
    workspace: null,
    ...overrides
  };
}

function renderPage() {
  return render(shell(<MonitorDefinitionPage />));
}

function shell(child: React.ReactNode) {
  return (
    <I18nextProvider i18n={i18n}>
      <App>{child}</App>
    </I18nextProvider>
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
