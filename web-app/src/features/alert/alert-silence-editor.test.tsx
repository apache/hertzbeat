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

import type { AlertSilenceDraft } from './alert-silence-model';

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

describe('AlertSilenceEditor schedule', () => {
  afterEach(cleanup);

  it('uses the existing model transition when the operator selects a recurring schedule', () => {
    const replace = vi.fn();
    render(
      <AlertSilenceEditor
        draft={onceDraft}
        saving={false}
        update={vi.fn()}
        replace={replace}
        close={vi.fn()}
        submit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'alertSilences.recurring' }));

    expect(replace).toHaveBeenCalledWith({
      ...onceDraft,
      type: 1,
      periodStart: '22:00',
      periodEnd: '02:00'
    });
  });

  it('keeps Sunday-first weekday order and the recurring cross-midnight guidance', () => {
    const update = vi.fn();
    render(
      <AlertSilenceEditor
        draft={{ ...onceDraft, type: 1, periodStart: '22:00', periodEnd: '02:00' }}
        saving={false}
        update={update}
        replace={vi.fn()}
        close={vi.fn()}
        submit={vi.fn()}
      />
    );

    const weekdayInputs = screen.getAllByRole('checkbox');
    expect(weekdayInputs.map(input => input.getAttribute('value'))).toEqual(['7', '1', '2', '3', '4', '5', '6']);
    expect(screen.getByText('alertSilences.crossMidnightHelp')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'alertSilences.week.3' }));
    expect(update).toHaveBeenCalledWith({ days: [7, 1, 2, 4, 5, 6] });
  });
});
