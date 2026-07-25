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
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MonitorParamDefine } from '../model/monitor-contract';
import { createMonitorEditorDraft } from '../model/monitor-editor-draft';
import { MonitorEditorFormView } from './monitor-editor-form-view';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }) }));

afterEach(cleanup);

const headers: MonitorParamDefine = {
  id: null,
  app: 'website',
  field: 'headers',
  name: { 'en-US': 'Headers' },
  type: 'key-value',
  required: true,
  defaultValue: null,
  placeholder: null,
  range: null,
  limit: null,
  options: null,
  keyAlias: null,
  valueAlias: null,
  depend: null,
  hide: false
};

describe('MonitorEditorFormView validation evidence', () => {
  it('offers navigation instead of a dead retry for invalid canonical data', () => {
    const controller = editorController([]);
    const invalidController = {
      ...controller,
      state: { ...controller.state, evidence: { kind: 'invalid' as const } }
    };

    render(<MonitorEditorFormView mode="new" controller={invalidController} />);

    expect(screen.getByRole('button', { name: 'common.back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  });

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

  it('retires local structured rows when the editor source changes', () => {
    const controller = editorController([]);
    controller.state.draft.monitor.labels = { region: 'east' };
    const rendered = render(<MonitorEditorFormView mode="new" controller={controller} />);
    const labels = within(screen.getByRole('group', { name: 'monitor.editor.labels' }));
    fireEvent.change(labels.getByLabelText('monitor.editor.map.key'), { target: { value: '' } });

    controller.state.sourceKey = 'edit:42:website:static';
    controller.state.draft = createMonitorEditorDraft(
      { monitor: { ...controller.state.draft.monitor, id: 42, labels: { region: 'west' } } },
      'website',
      'static',
      [headers]
    );
    rendered.rerender(<MonitorEditorFormView mode="edit" controller={controller} />);

    expect(
      within(screen.getByRole('group', { name: 'monitor.editor.labels' })).getByLabelText('monitor.editor.map.key')
    ).toHaveValue('region');
    expect(
      within(screen.getByRole('group', { name: 'monitor.editor.labels' })).getByLabelText('monitor.editor.map.value')
    ).toHaveValue('west');
  });

  it('offers canonical label suggestions without turning annotations into constrained fields', () => {
    const controller = editorController([]);
    controller.state.draft.monitor.labels = { env: 'prod' };
    controller.state.draft.monitor.annotations = { owner: 'ops' };
    controller.state.labelSuggestions = {
      keys: ['env', 'region'],
      valuesByKey: { env: ['prod', 'staging'], region: ['east', 'west'] }
    };

    render(<MonitorEditorFormView mode="new" controller={controller} />);

    expect(
      within(screen.getByRole('group', { name: 'monitor.editor.labels' })).getByRole('combobox', {
        name: 'monitor.editor.map.key'
      })
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'monitor.editor.annotations' })).getByRole('textbox', {
        name: 'monitor.editor.map.key'
      })
    ).toBeInTheDocument();
  });

  it('disables editable fields while a command owns the draft snapshot', () => {
    const controller = editorController([]);
    controller.state.busy = true;
    controller.state.command = 'detecting';
    render(<MonitorEditorFormView mode="new" controller={controller} />);

    expect(screen.getByLabelText('monitor.name')).toBeDisabled();
    expect(
      within(screen.getByRole('group', { name: 'monitor.editor.labels' })).getByRole('button', {
        name: 'monitor.editor.map.add'
      })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.cancel' })).not.toBeDisabled();
  });

  it('imports a Grafana dashboard template from an in-memory JSON file', async () => {
    const controller = editorController([]);
    controller.state.draft.monitor.app = 'prometheus';
    controller.state.draft.grafanaDashboard.enabled = true;
    const rendered = render(
      <App>
        <MonitorEditorFormView mode="new" controller={controller} />
      </App>
    );
    const file = new File(['ignored by the test double'], 'dashboard.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue('{"title":"Operations"}') });

    fireEvent.change(rendered.container.querySelector('input[type="file"]')!, { target: { files: [file] } });

    await waitFor(() =>
      expect(controller.actions.updateGrafana).toHaveBeenCalledWith({ template: '{"title":"Operations"}' })
    );
  });

  it('contains a Grafana template file read failure without changing the draft', async () => {
    const controller = editorController([]);
    controller.state.draft.monitor.app = 'prometheus';
    controller.state.draft.grafanaDashboard.enabled = true;
    const rendered = render(
      <App>
        <MonitorEditorFormView mode="new" controller={controller} />
      </App>
    );
    const file = new File(['unreadable'], 'dashboard.json', { type: 'application/json' });
    const readFile = vi.fn().mockRejectedValue(new Error('private file failure'));
    Object.defineProperty(file, 'text', { value: readFile });

    fireEvent.change(rendered.container.querySelector('input[type="file"]')!, { target: { files: [file] } });

    await waitFor(() => expect(readFile).toHaveBeenCalled());
    expect(controller.actions.updateGrafana).not.toHaveBeenCalled();
  });
});

function editorController(validationIssues: string[]) {
  const draft = createMonitorEditorDraft(undefined, 'website', 'static', [headers]);
  return {
    state: {
      evidence: { kind: 'ready' as const },
      draft,
      defines: [headers],
      apps: [{ value: 'website' }],
      collectors: [],
      busy: false,
      command: 'idle' as 'idle' | 'detecting' | 'saving',
      validationIssues,
      returnTo: '/monitors',
      scrapeValues: ['static'] as const,
      sourceKey: 'new:website:static',
      labelSuggestions: undefined as { keys: string[]; valuesByKey: Record<string, string[]> } | undefined
    },
    actions: {
      updateMonitor: vi.fn(),
      updateCollector: vi.fn(),
      updateGrafana: vi.fn(),
      updateParam: vi.fn(),
      setParamValid: vi.fn(),
      changeSource: vi.fn(),
      detect: vi.fn(),
      save: vi.fn(),
      cancel: vi.fn(),
      retry: vi.fn()
    }
  };
}
