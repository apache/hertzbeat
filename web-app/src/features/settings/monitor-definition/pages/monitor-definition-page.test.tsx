/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { App } from 'antd';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { buildMonitorListPath } from '@/shared/navigation/app-paths';
import { requireDomElement } from '@/test/dom-element';

const owner = vi.hoisted(() => ({ useController: vi.fn() }));
const editor = vi.hoisted(() => ({ setScrollPosition: vi.fn() }));
vi.mock('../controller/use-monitor-definition-controller', () => ({
  useMonitorDefinitionController: owner.useController
}));
vi.mock('@/shared/yaml-editor/yaml-code-editor', () => ({
  YamlCodeEditor: forwardRef(
    (
      {
        ariaLabel,
        value,
        readOnly,
        onChange,
        onScrollPositionChange
      }: {
        ariaLabel: string;
        value: string;
        readOnly: boolean;
        onChange?: (value: string) => void;
        onScrollPositionChange?: (position: { top: number; left: number }) => void;
      },
      ref
    ) => {
      useImperativeHandle(ref, () => ({
        setScrollPosition: (position: { top: number; left: number }) => {
          editor.setScrollPosition(ariaLabel, position);
        }
      }));
      return (
        <>
          <textarea
            aria-label={ariaLabel}
            data-hb-yaml-editor="codemirror"
            disabled={readOnly}
            value={value}
            onChange={event => onChange?.(event.target.value)}
          />
          <button aria-label={`${ariaLabel} scroll`} onClick={() => onScrollPositionChange?.({ top: 72, left: 8 })} />
        </>
      );
    }
  )
}));

import { MonitorDefinitionPage } from './monitor-definition-page';

const revision = 'a'.repeat(64);
const item = {
  app: 'mysql',
  label: 'MySQL',
  origin: 'override',
  editable: true,
  deletable: true,
  hidden: false,
  revision
};

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

  it('renders a persistent searchable selector and delegates selection directly to editing', () => {
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
    const selector = screen.getByRole('navigation', { name: 'Monitor definitions' });
    expect(page).toContainElement(header);
    expect(header).toContainElement(screen.getByRole('heading', { name: 'Monitor definitions' }));
    expect(headerActions).toContainElement(screen.getByRole('button', { name: 'Create definition' }));
    expect(document.querySelector('.ant-drawer')).not.toBeInTheDocument();
    expect(selector).toContainElement(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByText('MySQL')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search definitions'), { target: { value: 'mysql' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create definition' }));
    fireEvent.click(screen.getByRole('button', { name: 'MySQL mysql' }));

    expect(controller.actions.setSearch).toHaveBeenCalledWith('mysql');
    expect(controller.actions.openCreate).toHaveBeenCalledOnce();
    expect(controller.actions.openEdit).toHaveBeenCalledWith('mysql');
    expect(controller.actions.openView).not.toHaveBeenCalled();
    expect(screen.getByText('Select a monitor definition to inspect its current version.')).toBeInTheDocument();
  });

  it('renders editor validation, save, conflict refresh, and cancel actions', () => {
    const controller = buildController({
      workspace: {
        kind: 'edit',
        authority: { schemaVersion: 1, ...item, definition: 'app: mysql' },
        draft: { mode: 'update', expectedApp: 'mysql', definition: 'app: mysql\nname: draft', revision },
        failure: 'revision-conflict',
        pending: null,
        validation: null,
        writeRecovery: null
      }
    });
    owner.useController.mockReturnValue(controller);
    renderPage();

    expect(document.querySelectorAll('[data-hb-yaml-editor="codemirror"]')).toHaveLength(2);
    expect(screen.getByLabelText('Current version')).toBeDisabled();
    expect(screen.queryByText(revision)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Current version scroll' }));
    expect(editor.setScrollPosition).toHaveBeenCalledWith('Draft YAML', { top: 72, left: 8 });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Draft YAML'), { target: { value: 'app: mysql\nname: changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]!);
    expect(controller.actions.save).not.toHaveBeenCalled();
    const confirmation = screen.getByText('Save and apply changes to mysql?').closest('.ant-popover');
    expect(confirmation).not.toBeNull();
    fireEvent.click(within(confirmation as HTMLElement).getByRole('button', { name: 'Cancel' }));
    expect(controller.actions.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]!);
    fireEvent.click(
      within(screen.getByText('Save and apply changes to mysql?').closest('.ant-popover') as HTMLElement).getByRole(
        'button',
        { name: 'Save' }
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh latest definition' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[0]!);

    expect(controller.actions.setDefinition).toHaveBeenCalledWith('app: mysql\nname: changed');
    expect(controller.actions.validate).toHaveBeenCalledOnce();
    expect(controller.actions.save).toHaveBeenCalledOnce();
    expect(controller.actions.refreshAuthoritativeDraft).toHaveBeenCalledOnce();
    expect(controller.actions.requestDelete).toHaveBeenCalledWith({
      schemaVersion: 1,
      ...item,
      definition: 'app: mysql'
    });
    expect(controller.actions.cancelEdit).toHaveBeenCalledOnce();
  });

  it('keeps catalog selection read-only when write permission is unavailable', () => {
    const controller = buildController({ canWrite: false });
    owner.useController.mockReturnValue(controller);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'MySQL mysql' }));

    expect(controller.actions.openView).toHaveBeenCalledWith('mysql');
    expect(controller.actions.openEdit).not.toHaveBeenCalled();
  });

  it('shows authoritative visibility and confirms before changing it', () => {
    const controller = buildController();
    owner.useController.mockReturnValue(controller);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'mysql is currently visible' }));
    const popover = screen
      .getByText('mysql is currently visible. Change it to hidden?')
      .closest('.ant-popover') as HTMLElement;
    fireEvent.click(within(popover).getByRole('button', { name: 'Cancel' }));
    expect(controller.actions.updateVisibility).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'mysql is currently visible' }));
    fireEvent.click(
      within(
        screen.getByText('mysql is currently visible. Change it to hidden?').closest('.ant-popover') as HTMLElement
      ).getByRole('button', { name: 'Apply' })
    );

    expect(controller.actions.updateVisibility).toHaveBeenCalledWith(item);
  });

  it('opens a real built-in definition in the editable comparison workspace while keeping deletion disabled', () => {
    const builtin = { ...item, origin: 'builtin' as const, deletable: false };
    const builtinDetail = { schemaVersion: 1 as const, ...builtin, definition: 'app: mysql' };
    const controller = buildController({
      items: [builtin],
      workspace: {
        kind: 'edit',
        authority: builtinDetail,
        draft: { mode: 'update', expectedApp: 'mysql', definition: 'app: mysql\nname: override', revision },
        failure: null,
        pending: null,
        validation: null,
        writeRecovery: null
      }
    });
    owner.useController.mockReturnValue(controller);
    renderPage();

    expect(document.querySelectorAll('[data-hb-yaml-editor="codemirror"]')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('uses the shared canonical monitor-list path for the selected definition', () => {
    owner.useController.mockReturnValue(
      buildController({ workspace: { kind: 'view', detail: { schemaVersion: 1, ...item, definition: 'app: mysql' } } })
    );
    renderPage();

    expect(screen.getByRole('link', { name: 'View monitors' })).toHaveAttribute(
      'href',
      buildMonitorListPath({ app: 'mysql' })
    );
  });

  it('freezes an uncertain draft and offers only catalog evidence refresh or cancel', () => {
    const controller = buildController({
      workspace: {
        kind: 'edit',
        authority: { schemaVersion: 1, ...item, definition: 'app: mysql' },
        draft: { mode: 'update', expectedApp: 'mysql', definition: 'app: mysql', revision },
        failure: 'state-uncertain',
        pending: null,
        validation: null,
        writeRecovery: 'uncertain'
      }
    });
    owner.useController.mockReturnValue(controller);
    renderPage();

    expect(screen.getByLabelText('Draft YAML')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Validate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Refresh latest definition' })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Refresh' })[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(controller.actions.retryWorkspaceProof).toHaveBeenCalledOnce();
    expect(controller.actions.cancelEdit).toHaveBeenCalledOnce();
  });

  it('disables save for an unchanged authoritative update draft', () => {
    owner.useController.mockReturnValue(
      buildController({
        workspace: {
          kind: 'edit',
          authority: { schemaVersion: 1, ...item, definition: 'app: mysql' },
          draft: { mode: 'update', expectedApp: 'mysql', definition: 'app: mysql', revision },
          failure: null,
          pending: null,
          validation: null,
          writeRecovery: null
        }
      })
    );
    renderPage();

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
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
          authority: null,
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
    expect(document.querySelectorAll('[data-hb-yaml-editor="codemirror"]')).toHaveLength(1);
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

    owner.useController.mockReturnValue(
      buildController({ listState: { kind: 'error', failure: 'forbidden' }, items: [] })
    );
    page.rerender(shell(<MonitorDefinitionPage />));
    expect(screen.getByRole('status', { name: 'Administrator access is required for this operation.' })).toBeVisible();

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

  it('uses the shared command and result frame with a compact empty state', () => {
    owner.useController.mockReturnValue(buildController({ listState: { kind: 'empty' }, items: [] }));
    renderPage();

    expect(screen.getByRole('navigation', { name: 'Monitor definitions' })).toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-result-region]')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'No monitor definitions are available.' })).toBeVisible();
    expect(document.querySelector('.ant-empty-image')).not.toBeInTheDocument();
  });
});

function buildController(overrides: Record<string, unknown> = {}) {
  return {
    actions: {
      cancelDelete: vi.fn(),
      cancelEdit: vi.fn(),
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
      updateVisibility: vi.fn(),
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
    visibilityFailure: null,
    visibilityPendingApp: null,
    workspace: null,
    ...overrides
  };
}

function renderPage() {
  return render(shell(<MonitorDefinitionPage />));
}

function shell(child: React.ReactNode) {
  return (
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <App>{child}</App>
      </I18nextProvider>
    </MemoryRouter>
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
