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

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { ExploreSubmissionViewModel, LogExploreSubmissionDraft } from '../model/explore-submission-model';
import { ExploreLogQueryBuilder } from './explore-log-query-builder';
import { useLogQueryBuilder } from '../controller/use-log-query-builder';

describe('ExploreLogQueryBuilder', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(cleanup);

  it('keeps essential log dimensions visible and rare dimensions in a collapsed counted disclosure', () => {
    const updateField = vi.fn();
    const { container } = renderBuilder(logDraft(), 'builder', updateField);

    for (const label of ['Service name', 'Service namespace', 'Environment', 'Trace ID', 'Span ID']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('combobox', { name: 'Severity' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Attribute conditions' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Condition 1 scope' }).closest('.ant-select')).toHaveTextContent(
      'Resource'
    );
    expect(screen.getByRole('textbox', { name: 'Condition 1 field' })).toHaveValue('service.version');
    expect(screen.getByRole('combobox', { name: 'Condition 1 operator' }).closest('.ant-select')).toHaveTextContent(
      '='
    );
    expect(screen.getByRole('textbox', { name: 'Condition 1 value' })).toHaveValue('"2.0 beta"');
    expect(screen.getByRole('combobox', { name: 'Condition 2 scope' }).closest('.ant-select')).toHaveTextContent(
      'Log attribute'
    );
    expect(screen.getByRole('textbox', { name: 'Condition 2 field' })).toHaveValue('http.route');
    expect(screen.getByRole('checkbox', { name: i18n.t('exploreLog.hideInternal') })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Hide noise logs' })).toBeInTheDocument();
    expect(container.querySelector('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('textbox', { name: 'Service name' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Environment' })).toBeVisible();
    expect(screen.getByLabelText('Service namespace')).not.toBeVisible();
    fireEvent.click(screen.getByText('More filters'));

    fireEvent.change(screen.getByRole('textbox', { name: 'Service namespace' }), {
      target: { value: 'commerce' }
    });
    expect(updateField).toHaveBeenCalledWith({ field: 'serviceNamespace', value: 'commerce' });
  });

  it('shows the number of active rare filters without expanding and preserves manual disclosure state', () => {
    const { container } = renderBuilder(
      logDraft({ serviceNamespace: 'hertzbeat', traceId: 'abc' }),
      'builder',
      vi.fn()
    );
    expect(container.querySelector('details')).not.toHaveAttribute('open');
    expect(screen.getByText('More filters').parentElement).toHaveTextContent('2');
    fireEvent.click(screen.getByText('More filters'));
    expect(screen.getByRole('textbox', { name: 'Trace ID' })).toHaveValue('abc');
    fireEvent.change(screen.getByRole('textbox', { name: 'Trace ID' }), { target: { value: 'abcd' } });
    expect(container.querySelector('details')).toHaveAttribute('open');
  });

  it('does not mark backend colon syntax invalid because Builder cannot represent it', () => {
    const resourceFilter = 'service.name:checkout';
    renderBuilder(logDraft({ resourceFilter }), 'code', vi.fn());
    const field = screen.getByRole('textbox', { name: 'Resource filter code' });
    expect(field).toHaveValue(resourceFilter);
    expect(field).not.toHaveAttribute('aria-invalid');
  });

  it('keeps exact unparseable URL filters in Code and explains why Builder is unavailable', () => {
    const resourceFilter = `service.name LIKE "checkout api"`;
    renderBuilder(logDraft({ resourceFilter }), 'code', vi.fn());

    expect(screen.getByRole('textbox', { name: 'Resource filter code' })).toHaveValue(resourceFilter);
    expect(screen.getByRole('textbox', { name: 'Log attribute filter code' })).toHaveValue(
      'http.route CONTAINS "/pay"'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'This filter cannot be represented without loss in Builder. Keep editing the exact expression in Code.'
    );
  });

  it('serializes Builder edits back into the two existing backend filter fields', () => {
    const updateField = vi.fn();
    renderBuilder(logDraft(), 'builder', updateField);

    fireEvent.change(screen.getByRole('textbox', { name: 'Condition 1 value' }), {
      target: { value: '"2.1"' }
    });
    expect(updateField).toHaveBeenCalledWith({ field: 'resourceFilter', value: 'service.version = "2.1"' });
    expect(updateField).toHaveBeenCalledWith({ field: 'attributeFilter', value: 'http.route CONTAINS "/pay"' });
  });

  it('does not discard the last valid expression while a Builder value is incomplete', () => {
    const updateField = vi.fn();
    renderBuilder(logDraft(), 'builder', updateField);

    fireEvent.change(screen.getByRole('textbox', { name: 'Condition 1 value' }), {
      target: { value: '"unfinished' }
    });
    expect(screen.getByRole('textbox', { name: 'Condition 1 value' })).toHaveValue('"unfinished');
    expect(updateField).not.toHaveBeenCalledWith({ field: 'resourceFilter', value: '' });
  });

  it('collapses an empty Builder into one quiet action line without an empty condition row or header', () => {
    renderBuilder(logDraft({ resourceFilter: '', attributeFilter: '' }), 'builder', vi.fn());

    const conditions = screen.getByRole('group', { name: 'Attribute conditions' });
    expect(within(conditions).getByRole('button', { name: 'Add condition' })).toBeInTheDocument();
    expect(within(conditions).getByRole('checkbox', { name: i18n.t('exploreLog.hideInternal') })).toBeInTheDocument();
    expect(within(conditions).getByRole('checkbox', { name: 'Hide noise logs' })).toBeInTheDocument();
    expect(within(conditions).queryByRole('textbox', { name: 'Condition 1 field' })).not.toBeInTheDocument();
    expect(within(conditions).queryByText('Scope')).not.toBeInTheDocument();
  });
});

function renderBuilder(
  draft: LogExploreSubmissionDraft,
  mode: 'builder' | 'code',
  updateField: ExploreSubmissionViewModel['updateField']
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <BuilderHarness draft={draft} mode={mode} updateField={updateField} />
    </I18nextProvider>
  );
}

function BuilderHarness(props: {
  draft: LogExploreSubmissionDraft;
  mode: 'builder' | 'code';
  updateField: ExploreSubmissionViewModel['updateField'];
}) {
  const [draft, setDraft] = useState(props.draft);
  const updateField: ExploreSubmissionViewModel['updateField'] = change => {
    props.updateField(change);
    setDraft(current => ({ ...current, [change.field]: change.value }));
  };
  const editor = useLogQueryBuilder({ draft, updateField });
  return (
    <ExploreLogQueryBuilder draft={draft} mode={props.mode} t={i18n.t} updateField={updateField} editor={editor} />
  );
}

function logDraft(overrides: Partial<LogExploreSubmissionDraft> = {}): LogExploreSubmissionDraft {
  return {
    signal: 'logs',
    serviceName: '',
    serviceNamespace: '',
    environment: '',
    instance: '',
    endpoint: '',
    query: '',
    severityText: '',
    traceId: '',
    spanId: '',
    resourceFilter: 'service.version = "2.0 beta"',
    attributeFilter: 'http.route CONTAINS "/pay"',
    hideInternal: false,
    hideNoise: false,
    ...overrides
  };
}
