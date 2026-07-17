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

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MonitorParamDefine } from '../api/monitor-contract';
import { createMonitorEditorDraft } from '../model/monitor-editor-model';
import { MonitorEditorFormView } from './monitor-editor-form-view';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }) }));

const headers: MonitorParamDefine = {
  id: null, app: 'website', field: 'headers', name: { 'en-US': 'Headers' }, type: 'key-value', required: true,
  defaultValue: null, placeholder: null, range: null, limit: null, options: null, keyAlias: null,
  valueAlias: null, depend: null, hide: false
};

describe('MonitorEditorFormView validation evidence', () => {
  it('shows concrete field errors and removes them when controller issues converge', () => {
    const controller = editorController(['name', 'intervals', 'param:headers']);
    const rendered = render(<MonitorEditorFormView mode="new" controller={controller} />);
    expect(screen.getByText('monitor.editor.validation')).toBeInTheDocument();
    expect(within(screen.getByRole('alert')).getByText('Headers')).toBeInTheDocument();
    expect(screen.getByLabelText('monitor.name')).toHaveClass('ant-input-status-error');
    expect(screen.getByRole('spinbutton')).toHaveClass('ant-input-number-input');
    expect(rendered.container.querySelector('[aria-invalid="true"]')).not.toBeNull();

    controller.state.validationIssues = [];
    controller.state.draft.monitor.name = 'home';
    controller.state.draft.monitor.intervals = 10;
    rendered.rerender(<MonitorEditorFormView mode="new" controller={controller} />);
    expect(screen.queryByText('monitor.editor.validation')).not.toBeInTheDocument();
    expect(rendered.container.querySelector('[aria-invalid="true"]')).toBeNull();
  });

  it('marks an invalid cron expression instead of showing an interval error', () => {
    const controller = editorController(['cronExpression']);
    controller.state.draft.monitor.scheduleType = 'cron';
    controller.state.draft.monitor.cronExpression = '* * *';
    render(<MonitorEditorFormView mode="new" controller={controller} />);
    expect(screen.getByLabelText('monitor.editor.cronExpression')).toHaveClass('ant-input-status-error');
  });
});

function editorController(validationIssues: string[]) {
  const draft = createMonitorEditorDraft(undefined, 'website', 'static', [headers]);
  return {
    state: { evidence: { kind: 'ready' as const }, draft, defines: [headers], apps: [{ value: 'website' }],
      collectors: [], busy: false, command: 'idle' as const, validationIssues, returnTo: '/monitors',
      scrapeValues: ['static'] as const, sourceKey: 'new:website:static' },
    actions: { updateMonitor: vi.fn(), updateCollector: vi.fn(), updateGrafana: vi.fn(), updateParam: vi.fn(),
      setParamValid: vi.fn(), changeSource: vi.fn(), detect: vi.fn(), save: vi.fn(), cancel: vi.fn(), retry: vi.fn() }
  };
}
