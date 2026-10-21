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

import { App } from 'antd';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { MonitorImportDialog } from './monitor-import-dialog';

describe('MonitorImportDialog', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('acknowledges a selected file without recording its name and keeps submission explicit', () => {
    const submit = vi.fn().mockResolvedValue(true);
    const cancel = vi.fn();
    renderDialog({
      draft: { file: new File(['[]'], 'monitors.json') },
      onSubmit: submit,
      onCancel: cancel
    });

    expect(screen.getByText('Configuration file selected.')).toBeInTheDocument();
    expect(screen.queryByText('monitors.json')).not.toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Import configuration' }));
    expect(submit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('shows canonical in-progress, completed, and safe failure task evidence', () => {
    const page = renderDialog({ draft: { file: null }, task: { kind: 'ready', task: running, refreshing: false } });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('Import in progress')).toBeInTheDocument();

    page.rerender(dialog({ task: { kind: 'ready', task: completed, refreshing: false } }));
    expect(screen.getByText('Import completed')).toBeInTheDocument();

    page.rerender(dialog({ task: { kind: 'ready', task: failed, refreshing: false } }));
    expect(screen.getByText('The monitor configuration could not be imported.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('exception');
  });

  it('distinguishes a restarted-process 404 from failed or completed task state', () => {
    renderDialog({ draft: { file: null }, task: { kind: 'not-queryable' } });

    expect(screen.getByText('This import task is no longer queryable.')).toBeInTheDocument();
    expect(screen.queryByText('Import failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Import completed')).not.toBeInTheDocument();
  });

  it('shows validation and safe transport failures without backend details', () => {
    renderDialog({
      draft: { file: null },
      invalid: 'unsupported',
      failure: 'unavailable'
    });

    expect(screen.getByText('Choose a JSON, XLSX, or YAML file.')).toBeInTheDocument();
    expect(screen.getByText('Monitor import is temporarily unavailable.')).toBeInTheDocument();
  });

  it('guides the file picker to every supported monitor configuration extension', () => {
    renderDialog({ draft: { file: null } });

    expect(document.querySelector('input[type="file"]')).toHaveAttribute('accept', '.json,.xlsx,.yaml,.yml');
  });
});

function renderDialog(
  patch: Partial<React.ComponentProps<typeof MonitorImportDialog>['state']> &
    Partial<Pick<React.ComponentProps<typeof MonitorImportDialog>, 'onCancel' | 'onFile' | 'onSubmit'>>
) {
  const state = {
    canImport: true,
    open: true,
    draft: null,
    invalid: null,
    failure: null,
    busy: false,
    task: { kind: 'idle' as const },
    ...patch
  };
  return render(
    <I18nextProvider i18n={i18n}>
      <App>
        <MonitorImportDialog
          state={state}
          onCancel={patch.onCancel ?? vi.fn()}
          onFile={patch.onFile ?? vi.fn()}
          onSubmit={patch.onSubmit ?? vi.fn().mockResolvedValue(true)}
        />
      </App>
    </I18nextProvider>
  );
}

function dialog(patch: Partial<React.ComponentProps<typeof MonitorImportDialog>['state']>) {
  const state = {
    canImport: true,
    open: true,
    draft: { file: null },
    invalid: null,
    failure: null,
    busy: false,
    task: { kind: 'idle' as const },
    ...patch
  };
  return (
    <I18nextProvider i18n={i18n}>
      <App>
        <MonitorImportDialog state={state} onCancel={vi.fn()} onFile={vi.fn()} onSubmit={vi.fn()} />
      </App>
    </I18nextProvider>
  );
}

const running = {
  schemaVersion: 1 as const,
  taskId: '123e4567-e89b-42d3-a456-426614174000',
  taskType: 'MONITOR_IMPORT' as const,
  status: 'IN_PROGRESS' as const,
  progress: 40,
  createdAt: '2026-07-31T12:00:00Z',
  startedAt: '2026-07-31T12:00:00Z',
  completedAt: null,
  errorCode: null
};
const completed = { ...running, status: 'COMPLETED' as const, progress: 100, completedAt: '2026-07-31T12:00:10Z' };
const failed = {
  ...running,
  status: 'FAILED' as const,
  completedAt: '2026-07-31T12:00:10Z',
  errorCode: 'IMPORT_FAILED' as const
};
