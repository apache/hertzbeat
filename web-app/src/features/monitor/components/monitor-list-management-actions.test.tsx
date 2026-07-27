/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { MonitorListManagementActions } from './monitor-list-management-actions';

describe('MonitorListManagementActions permissions', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('keeps guest management read-only', () => {
    renderActions(false, false);

    expect(screen.getByRole('link', { name: i18n.t('monitor.help') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitor.editor.newTitle') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitor.import.action') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitor.export.all') })).not.toBeInTheDocument();
  });

  it('shows write actions to a user without administrator export', () => {
    renderActions(true, false);

    expect(screen.getByRole('button', { name: i18n.t('monitor.editor.newTitle') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('monitor.import.action') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitor.export.all') })).not.toBeInTheDocument();
  });
});

function renderActions(canWrite: boolean, canExport: boolean) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MonitorListManagementActions
        disabled={false}
        canWrite={canWrite}
        canExport={canExport}
        create={vi.fn()}
        openImport={vi.fn()}
        exportAll={vi.fn()}
      />
    </I18nextProvider>
  );
}
