/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const capability = vi.hoisted(() => ({ useMonitorCapabilities: vi.fn() }));
const editor = vi.hoisted(() => ({ useMonitorEditorController: vi.fn() }));
vi.mock('../controller/use-monitor-capabilities', () => capability);
vi.mock('../controller/use-monitor-editor-controller', () => editor);
vi.mock('../components/monitor-editor-form-view', () => ({
  MonitorEditorFormView: () => <div data-testid="monitor-editor-workspace" />
}));

import { MonitorEditorPage } from './monitor-editor-page';

describe('MonitorEditorPage access', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it.each(['new', 'edit'] as const)('keeps a guest direct %s route outside the editor workspace', mode => {
    capability.useMonitorCapabilities.mockReturnValue({ canWrite: false });

    renderPage(mode);

    expect(screen.getByText(i18n.t('monitor.editor.permissionTitle'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('monitor.editor.permissionDescription'))).toBeInTheDocument();
    expect(editor.useMonitorEditorController).not.toHaveBeenCalled();
    expect(screen.queryByTestId('monitor-editor-workspace')).not.toBeInTheDocument();
  });

  it.each(['new', 'edit'] as const)('admits an authorized %s workspace', mode => {
    capability.useMonitorCapabilities.mockReturnValue({ canWrite: true });
    editor.useMonitorEditorController.mockReturnValue({
      state: { sourceKey: mode },
      actions: {}
    });

    renderPage(mode);

    expect(editor.useMonitorEditorController).toHaveBeenCalledWith(mode);
    expect(screen.getByTestId('monitor-editor-workspace')).toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-page]')).toHaveAttribute('data-mode', 'form');
  });
});

function renderPage(mode: 'new' | 'edit') {
  return render(
    <I18nextProvider i18n={i18n}>
      <MonitorEditorPage mode={mode} />
    </I18nextProvider>
  );
}
