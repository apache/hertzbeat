/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted((): { value: unknown } => ({ value: undefined }));
vi.mock('../controller/use-plugin-controller', () => ({ usePluginController: () => controller.value }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { PluginPage } from './plugin-page';

describe('PluginPage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    controller.value = pluginController();
  });

  it('owns Upload in the shared header and list commands in the search band', () => {
    render(<PluginPage />);

    const page = document.querySelector('[data-hb-operational-page]');
    const header = document.querySelector('[data-hb-operational-page-header]');
    const headerActions = header?.querySelector('[data-hb-operational-page-actions]');
    const commandBand = screen.getByRole('search');
    expect(page).toContainElement(header);
    expect(header).toContainElement(screen.getByRole('heading', { name: 'plugins.title' }));
    expect(headerActions).toContainElement(screen.getByRole('button', { name: 'plugins.upload' }));
    expect(header).not.toContainElement(screen.getByRole('button', { name: 'common.refresh' }));
    expect(commandBand).toContainElement(screen.getByRole('button', { name: 'common.refresh' }));
    expect(commandBand).toContainElement(screen.getByRole('button', { name: 'plugins.deleteSelected' }));
    expect(commandBand).not.toContainElement(screen.getByRole('button', { name: 'plugins.upload' }));
  });

  it.each([
    ['loading', 'plugins.loading'],
    ['empty', 'plugins.empty'],
    ['search-empty', 'plugins.searchEmpty'],
    ['unavailable', 'plugins.failure.unavailable'],
    ['error', 'plugins.failure.error']
  ])('renders the explicit %s list state', (kind, message) => {
    controller.value = pluginController({ listState: { kind } });
    render(<PluginPage />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('shows read-only admission and contains no parameter editor action', () => {
    controller.value = pluginController({ canWrite: false });
    render(<PluginPage />);

    expect(screen.getByText('plugins.readOnly')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'plugins.upload' })).toBeDisabled();
    expect(screen.queryByText(/parameter/i)).not.toBeInTheDocument();
  });

  it('does not leak an upload failure into a delete operation', () => {
    controller.value = pluginController({
      uploadFailure: 'operation-failed',
      mutationFailure: null,
      deleteTarget: { ids: [11], label: 'audit', mode: 'single' }
    });
    render(<PluginPage />);

    expect(screen.queryByText('plugins.failure.operation-failed')).not.toBeInTheDocument();
    expect(screen.getByText('plugins.deleteConfirm')).toBeInTheDocument();
  });
});

function pluginController(overrides: Record<string, unknown> = {}) {
  return {
    canWrite: true,
    query: { search: '', pageIndex: 0, pageSize: 8 },
    searchDraft: '',
    selectedIds: [],
    listState: { kind: 'empty' },
    busy: false,
    uploadFailure: null,
    mutationFailure: null,
    notice: null,
    upload: null,
    uploadInvalid: { name: false, jarFile: false },
    deleteTarget: null,
    params: {
      editor: null,
      failure: null,
      invalid: [],
      busy: false,
      actions: {
        open: vi.fn(),
        cancel: vi.fn(),
        save: vi.fn(),
        updateValue: vi.fn(),
        updatePassword: vi.fn()
      }
    },
    actions: {
      cancelDelete: vi.fn(),
      cancelUpload: vi.fn(),
      confirmDelete: vi.fn(),
      openUpload: vi.fn(),
      openParams: vi.fn(),
      refresh: vi.fn(),
      requestDeleteOne: vi.fn(),
      requestDeleteSelected: vi.fn(),
      saveUpload: vi.fn(),
      setPage: vi.fn(),
      setSearchDraft: vi.fn(),
      setSelected: vi.fn(),
      setUploadEnabled: vi.fn(),
      setUploadFile: vi.fn(),
      setUploadName: vi.fn(),
      submitSearch: vi.fn(),
      toggleStatus: vi.fn()
    },
    ...overrides
  };
}
