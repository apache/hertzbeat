/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { MonitorBulkActions, MonitorRowActions } from './monitor-list-actions';

describe('monitor list action permissions', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('keeps guest rows read-only', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MonitorRowActions
          monitor={{ id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1 }}
          open={vi.fn()}
          run={vi.fn()}
          disabled={false}
          canWrite={false}
          canDelete={false}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('button', { name: i18n.t('common.view') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('common.edit') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitorActions.copy') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitorActions.pause') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitorActions.delete') })).not.toBeInTheDocument();
  });

  it('shows user row writes without administrator delete', () => {
    renderRowActions(true, false);

    expect(screen.getByRole('button', { name: i18n.t('common.edit') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('monitorActions.copy') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('monitorActions.pause') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitorActions.delete') })).not.toBeInTheDocument();
  });

  it('shows administrator delete', () => {
    renderRowActions(true, true);

    expect(screen.getByRole('button', { name: i18n.t('monitorActions.delete') })).toBeInTheDocument();
  });

  it('keeps user bulk actions writable but not administrative', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MonitorBulkActions
          selectedIds={[7]}
          run={vi.fn()}
          exportSelected={vi.fn()}
          canWrite
          canDelete={false}
          canExport={false}
          clearSelection={vi.fn()}
          disabled={false}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('button', { name: i18n.t('monitorActions.enable') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('monitorActions.pause') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitorActions.delete') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('monitor.export.selected') })).not.toBeInTheDocument();
  });
});

function renderRowActions(canWrite: boolean, canDelete: boolean) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MonitorRowActions
        monitor={{ id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1 }}
        open={vi.fn()}
        run={vi.fn()}
        disabled={false}
        canWrite={canWrite}
        canDelete={canDelete}
      />
    </I18nextProvider>
  );
}
