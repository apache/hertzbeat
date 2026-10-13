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
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AlertSilenceDraft } from '../model/alert-silence-model';
import type { AlertLabelSuggestionState } from '../model/alert-label-suggestion-model';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { AlertSilenceEditor } from './alert-silence-editor';

const onceDraft: AlertSilenceDraft = {
  name: 'Maintenance',
  enable: true,
  matchAll: true,
  type: 0,
  labelsText: '',
  days: [7, 1, 2, 3, 4, 5, 6],
  periodStart: '2026-07-19T22:00',
  periodEnd: '2026-07-20T02:00'
};

const labelSuggestions: AlertLabelSuggestionState = {
  kind: 'received',
  keys: ['service', 'environment'],
  catalog: { keys: ['service', 'environment'], valuesByKey: { service: ['checkout'] } }
};

describe('AlertSilenceEditor schedule', () => {
  afterEach(cleanup);

  it('uses the existing model transition when the operator selects a recurring schedule', () => {
    const replace = vi.fn();
    render(
      <AlertSilenceEditor
        draft={onceDraft}
        recovery={null}
        labelSuggestions={labelSuggestions}
        saving={false}
        writeLocked={false}
        update={vi.fn()}
        replace={replace}
        close={vi.fn()}
        retry={vi.fn()}
        submit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'alertSilences.recurring' }));

    expect(replace).toHaveBeenCalledWith({
      ...onceDraft,
      type: 1,
      periodStart: '22:00',
      periodEnd: '02:00',
      scheduleMemory: {
        once: { periodStart: '2026-07-19T22:00', periodEnd: '2026-07-20T02:00' },
        recurring: { periodStart: '22:00', periodEnd: '02:00' }
      }
    });
  });

  it('keeps Sunday-first weekday order and presents the recurring clocks as one source-aligned row', () => {
    const update = vi.fn();
    render(
      <AlertSilenceEditor
        draft={{ ...onceDraft, type: 1, periodStart: '22:00', periodEnd: '02:00' }}
        recovery={null}
        labelSuggestions={labelSuggestions}
        saving={false}
        writeLocked={false}
        update={update}
        replace={vi.fn()}
        close={vi.fn()}
        retry={vi.fn()}
        submit={vi.fn()}
      />
    );

    const weekdayInputs = screen.getAllByRole('checkbox');
    expect(weekdayInputs.map(input => input.getAttribute('value'))).toEqual(['7', '1', '2', '3', '4', '5', '6']);
    expect(screen.getByText('alertSilences.timeWindow')).toBeInTheDocument();
    expect(screen.queryByText('alertSilences.crossMidnightHelp')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.ant-picker-time-panel-column')).toHaveLength(0);
    expect(document.querySelectorAll('.ant-picker')).toHaveLength(2);
    expect(
      screen.getByRole('group', { name: 'alertSilences.timeWindow' }).closest('[data-control-width]')
    ).toHaveAttribute('data-control-width', 'wide');

    fireEvent.click(screen.getByRole('checkbox', { name: 'alertSilences.week.3' }));
    expect(update).toHaveBeenCalledWith({ days: [7, 1, 2, 4, 5, 6] });
  });

  it('makes the entire one-time editor inert while a save is in flight', () => {
    const close = vi.fn();
    render(
      <AlertSilenceEditor
        draft={{ ...onceDraft, matchAll: false, labelsText: 'service=api' }}
        recovery={null}
        labelSuggestions={labelSuggestions}
        saving
        writeLocked
        update={vi.fn()}
        replace={vi.fn()}
        close={close}
        retry={vi.fn()}
        submit={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('Maintenance')).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'alertSilences.matcherKey' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'alertSilences.matcherValue' })).toBeDisabled();
    screen.getAllByRole('switch').forEach(control => expect(control).toBeDisabled());
    screen.getAllByRole('radio').forEach(control => expect(control).toBeDisabled());
    const onceInputs = document.querySelectorAll('.ant-picker input');
    expect(onceInputs.length).toBeGreaterThan(0);
    onceInputs.forEach(control => expect(control).toBeDisabled());
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(close).not.toHaveBeenCalled();
  });

  it('disables recurring weekday and clock controls while a save is in flight', () => {
    render(
      <AlertSilenceEditor
        draft={{ ...onceDraft, type: 1, periodStart: '22:00', periodEnd: '02:00' }}
        recovery={null}
        labelSuggestions={labelSuggestions}
        saving
        writeLocked
        update={vi.fn()}
        replace={vi.fn()}
        close={vi.fn()}
        retry={vi.fn()}
        submit={vi.fn()}
      />
    );

    screen.getAllByRole('checkbox').forEach(control => expect(control).toBeDisabled());
    const recurringInputs = document.querySelectorAll('.ant-picker input');
    expect(recurringInputs.length).toBeGreaterThan(0);
    recurringInputs.forEach(control => expect(control).toBeDisabled());
  });

  it('matches the official modal width and blocks an invalid draft with field-local evidence', () => {
    const submit = vi.fn();
    render(
      <AlertSilenceEditor
        draft={{ ...onceDraft, name: '' }}
        recovery={null}
        labelSuggestions={labelSuggestions}
        saving={false}
        writeLocked={false}
        update={vi.fn()}
        replace={vi.fn()}
        close={vi.fn()}
        retry={vi.fn()}
        submit={submit}
      />
    );

    expect(document.querySelector('.ant-modal')).toHaveStyle({ width: '40%' });
    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));

    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText('alertSilences.required')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'alertSilences.name' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('blocks equal recurring clocks with schedule-specific field evidence', () => {
    const submit = vi.fn();
    render(
      <AlertSilenceEditor
        draft={{ ...onceDraft, type: 1, periodStart: '10:30', periodEnd: '10:30' }}
        recovery={null}
        labelSuggestions={labelSuggestions}
        saving={false}
        writeLocked={false}
        update={vi.fn()}
        replace={vi.fn()}
        close={vi.fn()}
        retry={vi.fn()}
        submit={submit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));

    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText('alertSilences.recurringPeriodInvalid')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'alertSilences.start' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox', { name: 'alertSilences.end' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('gives the one-time datetime range the remaining row width without widening every field', () => {
    render(
      <AlertSilenceEditor
        draft={onceDraft}
        recovery={null}
        labelSuggestions={labelSuggestions}
        saving={false}
        writeLocked={false}
        update={vi.fn()}
        replace={vi.fn()}
        close={vi.fn()}
        retry={vi.fn()}
        submit={vi.fn()}
      />
    );

    const range = document.querySelector('.ant-picker');
    expect(range?.closest('[data-control-width]')).toHaveAttribute('data-control-width', 'wide');
    expect(screen.getByRole('textbox', { name: 'alertSilences.name' }).closest('[data-control-width]')).toBeNull();
  });

  it('uses searchable label key and value rows instead of a raw matcher textarea', () => {
    render(
      <AlertSilenceEditor
        draft={{ ...onceDraft, matchAll: false, labelsText: 'service=checkout' }}
        recovery={null}
        labelSuggestions={labelSuggestions}
        saving={false}
        writeLocked={false}
        update={vi.fn()}
        replace={vi.fn()}
        close={vi.fn()}
        retry={vi.fn()}
        submit={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox', { name: 'alertSilences.matcherKey' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'alertSilences.matcherValue' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('alertSilences.matcherPlaceholder')).not.toBeInTheDocument();
  });

  it('does not silently save an incomplete visible label row', () => {
    const submit = vi.fn();
    const update = vi.fn();
    render(
      <AlertSilenceEditor
        draft={{ ...onceDraft, matchAll: false, labelsText: '' }}
        recovery={null}
        labelSuggestions={labelSuggestions}
        saving={false}
        writeLocked={false}
        update={update}
        replace={vi.fn()}
        close={vi.fn()}
        retry={vi.fn()}
        submit={submit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }));

    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'alertSilences.matcherKey' })).toHaveAttribute('aria-invalid', 'true');
  });
});
