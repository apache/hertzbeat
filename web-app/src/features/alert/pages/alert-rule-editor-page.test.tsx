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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAlertRuleDraft } from '../model/alert-rule-model';
import { AlertRuleEditorPage } from './alert-rule-editor-page';

const controller = vi.hoisted(() => ({
  cancel: vi.fn(),
  changeDataType: vi.fn(),
  changeKind: vi.fn(),
  changeMetricApplication: vi.fn(),
  changeMetricTarget: vi.fn(),
  preview: vi.fn(),
  retryDetail: vi.fn(),
  retryDatasource: vi.fn(),
  retryMetricTargetApps: vi.fn(),
  retryMetricTargetHierarchy: vi.fn(),
  retrySave: vi.fn(),
  save: vi.fn(),
  state: {},
  updateDraft: vi.fn()
}));
vi.mock('../controller/use-alert-rule-editor-controller', () => ({ useAlertRuleEditorController: () => controller }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('AlertRuleEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controller.state = buildState();
  });
  afterEach(cleanup);

  it.each([
    ['loading', 'loading'],
    ['missing', 'common.notFound.description'],
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description']
  ])('renders detail state %s honestly', (kind, evidence) => {
    controller.state = buildState({ detail: { kind } });
    render(<AlertRuleEditorPage mode="edit" />);
    if (evidence === 'loading') expect(document.querySelector('.ant-spin-spinning')).not.toBeNull();
    else expect(screen.getByText(evidence)).toBeInTheDocument();
  });

  it.each([
    ['empty', 'alertRules.previewEmpty'],
    ['unavailable', 'common.unavailable'],
    ['error', 'alertRules.previewFailed']
  ])('renders preview state %s distinctly', (kind, evidence) => {
    controller.state = buildState({ preview: { kind } });
    render(<AlertRuleEditorPage mode="new" />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
  });

  it.each([
    ['missing', 'common.notFound.description'],
    ['unavailable', 'common.unavailable'],
    ['error', 'alertRules.saveFailed']
  ])('renders save failure %s distinctly', (failure, evidence) => {
    controller.state = buildState({ saveFailure: failure });
    render(<AlertRuleEditorPage mode="new" />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
  });

  it('offers retry only for recoverable proof and keeps commit uncertainty write-locked', () => {
    controller.state = buildState({
      recovery: { phase: 'proof', failure: 'unavailable', retryable: true }
    });
    render(<AlertRuleEditorPage mode="new" />);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retrySave).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    expect(screen.getByLabelText('alertRules.name')).toBeDisabled();

    cleanup();
    controller.state = buildState({
      recovery: { phase: 'commit-uncertain', failure: 'unavailable', retryable: false }
    });
    render(<AlertRuleEditorPage mode="new" />);
    expect(screen.queryByRole('button', { name: 'common.retry' })).toBeNull();
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
  });

  it('preserves cleared period and times as null for validation', () => {
    controller.state = buildState({ draft: { ...createAlertRuleDraft(), kind: 'periodic' } });
    render(<AlertRuleEditorPage mode="new" />);
    fireEvent.change(screen.getByLabelText('alertRules.period'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('alertRules.times'), { target: { value: '' } });
    expect(controller.updateDraft).toHaveBeenCalledWith({ period: null });
    expect(controller.updateDraft).toHaveBeenCalledWith({ times: null });
  });

  it.each([
    [{ kind: 'loading' }, 'alertRules.datasource.checking'],
    [{ kind: 'ready', status: { hasPromqlExecutor: false, hasSqlExecutor: false } }, 'alertRules.datasource.none'],
    [{ kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: false } }, 'alertRules.datasource.promqlOnly'],
    [{ kind: 'ready', status: { hasPromqlExecutor: false, hasSqlExecutor: true } }, 'alertRules.datasource.sqlOnly']
  ])('renders datasource capability state %#', (datasource, message) => {
    controller.state = buildState({ datasource });
    render(<AlertRuleEditorPage mode="new" />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it.each([
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description']
  ])('renders and retries datasource %s without retrying rule detail', (kind, message) => {
    controller.state = buildState({ datasource: { kind } });
    render(<AlertRuleEditorPage mode="new" />);

    expect(screen.getByText(message)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));

    expect(controller.retryDatasource).toHaveBeenCalledOnce();
    expect(controller.retryDetail).not.toHaveBeenCalled();
  });

  it('renders ready preview and delegates draft, preview, save, and cancel', () => {
    controller.state = buildState({ preview: { kind: 'ready', matchCount: 1 } });
    render(<AlertRuleEditorPage mode="new" />);
    expect(screen.getByText('alertRules.previewSuccess')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('alertRules.name'), { target: { value: 'New' } });
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(controller.updateDraft).toHaveBeenCalledWith({ name: 'New' });
    expect(controller.preview).toHaveBeenCalled();
    expect(controller.save).toHaveBeenCalled();
    expect(controller.cancel).toHaveBeenCalled();
  });

  it('disables every mutable field while save owns the operation gate', () => {
    controller.state = buildState({
      command: 'saving',
      draft: { ...createAlertRuleDraft(), kind: 'periodic' }
    });
    render(<AlertRuleEditorPage mode="new" />);

    for (const label of [
      'alertRules.name',
      'alertRules.expression',
      'alertRules.template',
      'alertRules.labels',
      'alertRules.period',
      'alertRules.times'
    ]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    for (const select of screen.getAllByRole('combobox')) expect(select).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});

function buildState(override: Record<string, unknown> = {}) {
  return {
    command: 'idle',
    datasource: {
      kind: 'ready',
      status: { hasPromqlExecutor: true, hasSqlExecutor: true }
    },
    detail: { kind: 'ready' },
    draft: createAlertRuleDraft(),
    metricTarget: { apps: { kind: 'ready', apps: [] }, hierarchy: { kind: 'idle' } },
    preview: { kind: 'idle' },
    recovery: undefined,
    saveFailure: undefined,
    ...override
  };
}
