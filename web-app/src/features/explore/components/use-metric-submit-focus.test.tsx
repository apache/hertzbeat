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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  draftFromQuery,
  type ExploreSubmissionErrors,
  type ExploreSubmissionViewModel
} from '../model/explore-submission-model';
import { useExploreSubmitFocus } from './use-metric-submit-focus';
function Fixture({
  errors = {},
  signal = 'metrics'
}: {
  errors?: ExploreSubmissionErrors;
  signal?: 'metrics' | 'logs';
}) {
  const submission: ExploreSubmissionViewModel = {
    draft: draftFromQuery({ signal, timeRange: 'last-30m' }),
    errors,
    submit: vi.fn(),
    updateField: vi.fn(),
    resetDraft: vi.fn(),
    applyLogPatch: vi.fn(),
    removeFilter: vi.fn(),
    removeFilters: vi.fn()
  };
  const { queryRef, requestFocus } = useExploreSubmitFocus(submission);
  return (
    <div ref={queryRef}>
      <button onClick={requestFocus}>Query fixture</button>
      {signal === 'logs' && <input aria-label="Log fixture" data-log-search-input />}
      <details>
        <summary>Editor fixture</summary>
        <input aria-label="Formula fixture" data-metric-plan-ref="f1" data-metric-plan-field="formula" />
        <div role="alert" tabIndex={-1} data-metric-issue-ref="f1" data-metric-issue-field="formula">
          Invalid formula fixture
        </div>
      </details>
    </div>
  );
}
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
beforeEach(() =>
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll);
  else delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});
describe('explicit metric submit focus', () => {
  it('opens and reaches the error only after an explicit rejected submission', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    render(<Fixture errors={{ metricPlan: 'invalid_metric_plan' }} />);
    expect(scroll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(scroll).toHaveBeenCalledOnce();
  });
  it('consumes a successful attempt and ignores later asynchronous errors or draft rerenders', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    const { rerender } = render(<Fixture />);
    const query = screen.getByRole('button');
    query.focus();
    fireEvent.click(query);
    rerender(<Fixture errors={{ metricPlan: 'invalid_metric_plan' }} />);
    expect(query).toHaveFocus();
    expect(scroll).not.toHaveBeenCalled();
    fireEvent.click(query);
    expect(scroll).toHaveBeenCalledOnce();
    query.focus();
    rerender(<Fixture errors={{ metricPlan: 'invalid_metric_plan' }} />);
    expect(query).toHaveFocus();
    expect(scroll).toHaveBeenCalledOnce();
  });
  it('leaves Logs submission focus unchanged', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    render(<Fixture signal="logs" errors={{ metricPlan: 'invalid_metric_plan' }} />);
    const query = screen.getByRole('button');
    query.focus();
    fireEvent.click(query);
    expect(query).toHaveFocus();
    expect(scroll).not.toHaveBeenCalled();
  });
});

it('focuses the log input only on an explicit rejected submit and consumes successful attempts', () => {
  const { rerender } = render(<Fixture signal="logs" />);
  const query = screen.getByRole('button');
  query.focus();
  fireEvent.click(query);
  rerender(<Fixture signal="logs" errors={{ query: 'unclosed_quote' }} />);
  expect(query).toHaveFocus();
  fireEvent.click(query);
  expect(screen.getByRole('textbox', { name: 'Log fixture' })).toHaveFocus();
  query.focus();
  rerender(<Fixture signal="logs" errors={{ query: 'unclosed_quote' }} />);
  expect(query).toHaveFocus();
});
