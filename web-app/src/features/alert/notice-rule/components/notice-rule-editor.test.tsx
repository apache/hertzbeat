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
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNoticeRuleDraft, type NoticeRuleDraft } from '../model/notice-rule-model';
import type { NoticeRuleOperationRecovery } from '../model/notice-rule-operation-state';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { NoticeRuleEditor } from './notice-rule-editor';

describe('NoticeRuleEditor advanced fields', () => {
  afterEach(cleanup);

  it('patches forwarding mode directly and only renders label matching when needed', () => {
    const update = vi.fn();
    const first = renderEditor(createNoticeRuleDraft(), update);
    openAdvancedFields();

    expect(screen.queryByPlaceholderText('noticeRules.labelsPlaceholder')).not.toBeInTheDocument();
    fireEvent.click(fieldSwitch('noticeRules.forwardAll'));
    expect(update).toHaveBeenCalledWith({ filterAll: false });

    first.unmount();
    update.mockClear();
    renderEditor({ ...createNoticeRuleDraft(), filterAll: false, labelsText: 'severity:critical' }, update);
    openAdvancedFields();
    fireEvent.change(screen.getByPlaceholderText('noticeRules.labelsPlaceholder'), {
      target: { value: 'service:checkout' }
    });
    expect(update).toHaveBeenCalledWith({ labelsText: 'service:checkout' });
  });

  it('preserves days when enabling limits and resets all days in the disabling patch', () => {
    const update = vi.fn();
    const first = renderEditor(createNoticeRuleDraft(), update);
    openAdvancedFields();

    fireEvent.click(fieldSwitch('noticeRules.limitDays'));
    expect(update).toHaveBeenCalledWith({ limitDays: true });

    first.unmount();
    update.mockClear();
    renderEditor({ ...createNoticeRuleDraft(), limitDays: true, days: [7, 2] }, update);
    openAdvancedFields();
    fireEvent.click(fieldSwitch('noticeRules.limitDays'));
    expect(update).toHaveBeenCalledWith({ limitDays: false, days: [1, 2, 3, 4, 5, 6, 7] });
  });

  it('keeps weekday order, time display, weekday patches, and period guidance', () => {
    const update = vi.fn();
    renderEditor({ ...createNoticeRuleDraft(), limitDays: true, periodStart: '22:00', periodEnd: '06:00' }, update);
    openAdvancedFields();

    const weekdayInputs = screen.getAllByRole('checkbox');
    expect(weekdayInputs.map(input => input.getAttribute('value'))).toEqual(['7', '1', '2', '3', '4', '5', '6']);
    expect(screen.getByDisplayValue('22:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('06:00')).toBeInTheDocument();
    expect(screen.getByText('noticeRules.periodHelp')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'noticeRules.week.3' }));
    expect(update).toHaveBeenCalledWith({ days: [7, 1, 2, 4, 5, 6] });
  });

  it('renders invalid canonical time evidence as an empty input', () => {
    renderEditor({ ...createNoticeRuleDraft(), periodStart: 'invalid' }, vi.fn());
    openAdvancedFields();

    expect(screen.queryByDisplayValue('invalid')).not.toBeInTheDocument();
  });

  it('disables save but keeps cancel available when dependencies become non-ready', () => {
    renderEditor(createNoticeRuleDraft(), vi.fn(), false);

    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeEnabled();
  });

  it('does not expose inert save or cancel actions while proof ownership is retained', () => {
    renderEditor(createNoticeRuleDraft(), vi.fn(), true, {
      kind: 'create',
      phase: 'commit-uncertain',
      failure: 'commit-uncertain',
      retryable: false
    });

    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
  });

  it.each([
    [
      'recovery',
      false,
      {
        kind: 'create',
        phase: 'commit-uncertain',
        failure: 'commit-uncertain',
        retryable: false
      } satisfies NoticeRuleOperationRecovery
    ],
    ['saving', true, undefined]
  ] as const)('disables every visible field while %s owns the editor', (_label, saving, recovery) => {
    const draft = {
      ...createNoticeRuleDraft(),
      filterAll: false,
      labelsText: 'severity:critical',
      limitDays: true
    };
    const update = vi.fn();
    const view = renderEditor(draft, update);
    openAdvancedFields();

    view.rerender(editorElement(draft, update, true, recovery, saving));

    const nativeControls = ['textbox', 'switch', 'checkbox'].flatMap(role => screen.queryAllByRole(role));
    expect(nativeControls.length).toBeGreaterThan(0);
    nativeControls.forEach(control => expect(control).toBeDisabled());
    expect(document.querySelectorAll('.ant-select-disabled')).toHaveLength(2);
    expect(screen.getByText('noticeRules.advanced').closest('[role="button"]')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });
});

function renderEditor(
  draft: NoticeRuleDraft,
  update: (patch: Partial<NoticeRuleDraft>) => void,
  dependenciesReady = true,
  recovery?: NoticeRuleOperationRecovery,
  saving = false
) {
  return render(editorElement(draft, update, dependenciesReady, recovery, saving));
}

function editorElement(
  draft: NoticeRuleDraft,
  update: (patch: Partial<NoticeRuleDraft>) => void,
  dependenciesReady = true,
  recovery?: NoticeRuleOperationRecovery,
  saving = false
) {
  return (
    <NoticeRuleEditor
      draft={draft}
      receivers={[]}
      templates={[]}
      saving={saving}
      dependenciesReady={dependenciesReady}
      selectReceivers={vi.fn()}
      update={update}
      close={vi.fn()}
      submit={vi.fn()}
      recovery={recovery}
      canRetry={Boolean(recovery?.retryable)}
      retryBusy={false}
      retry={vi.fn()}
    />
  );
}

function openAdvancedFields() {
  fireEvent.click(screen.getByText('noticeRules.advanced'));
}

function fieldSwitch(label: string) {
  const field = screen.getByText(label).closest('label');
  if (!field) throw new Error(`Missing field for ${label}`);
  return within(field).getByRole('switch');
}
