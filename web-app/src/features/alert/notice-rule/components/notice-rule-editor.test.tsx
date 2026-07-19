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

  it('disables save but keeps cancel available when dependencies become non-ready', () => {
    renderEditor(createNoticeRuleDraft(), vi.fn(), false);

    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeEnabled();
  });
});

function renderEditor(
  draft: NoticeRuleDraft,
  update: (patch: Partial<NoticeRuleDraft>) => void,
  dependenciesReady = true
) {
  return render(
    <NoticeRuleEditor
      draft={draft}
      receivers={[]}
      templates={[]}
      saving={false}
      dependenciesReady={dependenciesReady}
      selectReceivers={vi.fn()}
      update={update}
      close={vi.fn()}
      submit={vi.fn()}
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
