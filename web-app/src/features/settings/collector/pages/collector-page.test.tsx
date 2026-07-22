/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const resource = vi.hoisted(() => ({
  useCollectorController: vi.fn()
}));

vi.mock('../controller/use-collector-controller', () => ({
  useCollectorController: resource.useCollectorController
}));

import { CollectorPage } from './collector-page';

describe('CollectorPage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => resource.useCollectorController.mockReturnValue(buildController()));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the canonical workflow and delegates search, refresh, paging, and row actions', () => {
    const controller = buildController();
    resource.useCollectorController.mockReturnValue(controller);
    renderPage();

    expect(screen.getByRole('heading', { name: 'Collector management' })).toBeInTheDocument();
    expect(screen.getAllByText('10.0.0.7')).toHaveLength(2);
    fireEvent.change(screen.getByPlaceholderText('Search collectors'), { target: { value: ' west ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take edge offline' }));
    fireEvent.click(screen.getByTitle('Next Page'));

    expect(controller.actions.setNameDraft).toHaveBeenCalledWith(' west ');
    expect(controller.actions.submitName).toHaveBeenCalledTimes(1);
    expect(controller.actions.refresh).toHaveBeenCalledTimes(1);
    expect(controller.actions.requestAction).toHaveBeenCalledWith('offline', ['edge']);
    expect(controller.actions.setPage).toHaveBeenCalledWith(1, 8);
    expect(
      screen.queryByRole('button', { name: /main-default-collector (online|offline|delete)/i })
    ).not.toBeInTheDocument();
  });

  it('requires explicit confirmation and supports cancel without executing the mutation', () => {
    const controller = buildController({
      pendingAction: { action: 'delete', collectors: ['edge'] }
    });
    resource.useCollectorController.mockReturnValue(controller);
    renderPage();

    const dialog = screen.getByRole('dialog', { name: 'Delete this Collector?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(controller.actions.cancelAction).toHaveBeenCalledTimes(1);
    expect(controller.actions.confirmAction).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(controller.actions.confirmAction).toHaveBeenCalledTimes(1);
  });

  it('keeps batch mutation entry points selection-gated and confirmed', () => {
    const controller = buildController();
    resource.useCollectorController.mockReturnValue(controller);
    renderPage();

    expect(screen.getByRole('button', { name: 'Take selected online' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select edge' }));
    expect(controller.actions.toggleSelection).toHaveBeenCalledWith('edge', true);

    resource.useCollectorController.mockReturnValue(buildController({ selected: ['edge'] }));
    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    expect(resource.useCollectorController.mock.results.at(-1)?.value.actions.requestAction).toHaveBeenCalledWith(
      'delete',
      ['edge']
    );
  });

  it.each([
    ['loading', 'collector-loading'],
    ['empty', 'No collectors match the current query.'],
    ['unavailable', 'Collector data is unavailable.'],
    ['error', 'This page could not be loaded. Retry or return to it later.']
  ] as const)('keeps the %s list state honest and distinct', (kind, evidence) => {
    resource.useCollectorController.mockReturnValue(buildController({ listState: { kind } }));
    renderPage();

    if (evidence === 'collector-loading') expect(screen.getByTestId(evidence)).toBeInTheDocument();
    else expect(screen.getByText(evidence)).toBeInTheDocument();
    expect(screen.queryByText('10.0.0.7')).not.toBeInTheDocument();
  });

  it.each([
    ['permission', 'You do not have permission to change this Collector.'],
    ['validation', 'The Collector change was rejected. Review its current server state.']
  ] as const)('shows classified %s feedback without raw server detail', (failure, copy) => {
    resource.useCollectorController.mockReturnValue(buildController({ mutationFailure: failure }));
    renderPage();

    expect(screen.getByText(copy)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('raw detail');
  });
});

function buildController(overrides: Record<string, unknown> = {}) {
  return {
    query: { name: '', pageIndex: 0, pageSize: 8 },
    nameDraft: '',
    listState: {
      kind: 'ready',
      records: [collector('edge'), collector('main-default-collector', true)],
      total: 17
    },
    refreshing: false,
    mutating: false,
    mutationFailure: null,
    pendingAction: null,
    selected: [],
    actions: {
      setNameDraft: vi.fn(),
      submitName: vi.fn(),
      setPage: vi.fn(),
      refresh: vi.fn(),
      requestAction: vi.fn(),
      toggleSelection: vi.fn(),
      toggleAll: vi.fn(),
      cancelAction: vi.fn(),
      confirmAction: vi.fn()
    },
    ...overrides
  };
}

function collector(name: string, immutable = false) {
  return {
    name,
    address: '10.0.0.7',
    version: '2.0.0',
    mode: 'public',
    online: true,
    immutable,
    pinMonitorNum: 2,
    dispatchMonitorNum: 3,
    updatedAt: '2026-07-22T10:00:00',
    runtimeStatus: null,
    runtimeStatusReportedAt: null,
    instrumentationIntake: { state: 'unavailable', errorCode: 'intake_not_advertised' }
  };
}

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/settings/collectors']}>
        <App>
          <CollectorPage />
        </App>
      </MemoryRouter>
    </I18nextProvider>
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
