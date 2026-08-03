/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { MonitorAppPickerDialog } from './monitor-app-picker-dialog';

describe('MonitorAppPickerDialog', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('renders the Angular-compatible grouped catalog and selects an explicit app', () => {
    const select = vi.fn();
    renderDialog({ select });

    const dialog = screen.getByRole('dialog', { name: i18n.t('monitor.appPicker.title') });
    const database = within(dialog).getByRole('group', { name: i18n.t('monitor.categories.db') });
    expect(database).toHaveTextContent('2');
    expect(within(database).getByRole('button', { name: 'MySQL' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Internal' })).not.toBeInTheDocument();

    fireEvent.click(within(database).getByRole('button', { name: 'PostgreSQL' }));
    expect(select).toHaveBeenCalledWith('postgresql');
  });

  it('filters the catalog and closes without choosing or changing navigation', () => {
    const search = vi.fn();
    const cancel = vi.fn();
    const select = vi.fn();
    const view = renderDialog({ search, cancel, select });

    fireEvent.change(screen.getByRole('searchbox', { name: i18n.t('monitor.appPicker.search') }), {
      target: { value: 'post' }
    });
    expect(search).toHaveBeenCalledWith('post');

    view.rerender(
      <I18nextProvider i18n={i18n}>
        <MonitorAppPickerDialog {...dialogProps} search="post" onSearch={search} onCancel={cancel} onSelect={select} />
      </I18nextProvider>
    );
    expect(screen.queryByRole('button', { name: 'MySQL' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PostgreSQL' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
  });

  it.each([
    ['loading', 'status', ''],
    ['unavailable', 'alert', 'common.unavailable'],
    ['error', 'alert', 'common.routeError.description']
  ] as const)('keeps %s catalog evidence distinct from an empty search result', (kind, role, messageKey) => {
    render(
      <I18nextProvider i18n={i18n}>
        <MonitorAppPickerDialog
          {...dialogProps}
          evidence={{ kind }}
          onSearch={vi.fn()}
          onCancel={vi.fn()}
          onSelect={vi.fn()}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole(role)).toBeInTheDocument();
    if (messageKey) expect(screen.getByText(i18n.t(messageKey))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('monitor.appPicker.empty'))).not.toBeInTheDocument();
  });
});

const dialogProps = {
  open: true,
  search: '',
  evidence: {
    kind: 'ready' as const,
    options: [],
    groups: [
      { category: 'service', apps: [{ value: 'website', label: 'Website' }] },
      {
        category: 'db',
        apps: [
          { value: 'mysql', label: 'MySQL' },
          { value: 'postgresql', label: 'PostgreSQL' }
        ]
      }
    ]
  }
};

function renderDialog(actions: {
  search?: (value: string) => void;
  cancel?: () => void;
  select?: (app: string) => void;
}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MonitorAppPickerDialog
        {...dialogProps}
        onSearch={actions.search ?? vi.fn()}
        onCancel={actions.cancel ?? vi.fn()}
        onSelect={actions.select ?? vi.fn()}
      />
    </I18nextProvider>
  );
}
