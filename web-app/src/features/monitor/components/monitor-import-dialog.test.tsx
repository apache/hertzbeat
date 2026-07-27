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

  it('shows the selected file and keeps submission explicit', () => {
    const submit = vi.fn().mockResolvedValue(true);
    const cancel = vi.fn();
    renderDialog({
      draft: { file: new File(['[]'], 'monitors.json') },
      onSubmit: submit,
      onCancel: cancel
    });

    expect(screen.getByText('Selected: monitors.json')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Import configuration' }));
    expect(submit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalledOnce();
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
    draft: null,
    invalid: null,
    failure: null,
    busy: false,
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
