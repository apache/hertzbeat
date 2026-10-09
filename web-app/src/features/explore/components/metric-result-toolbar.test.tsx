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

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MetricExecutedQuery } from './metric-result-toolbar';

const t = ((key: string) => key) as TFunction;
const expression = 'actual_cpu{workspace_id="default"}';

function openQuery() {
  fireEvent.click(screen.getByText('exploreMetric.responseQuery', { selector: 'summary' }));
}

describe('executed metric query copy', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('copies only the executed expression and expires the success announcement', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<MetricExecutedQuery query={expression} t={t} />);
    openQuery();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'exploreMetric.copyQuery' }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledExactlyOnceWith(expression);
    expect(screen.getByRole('status')).toHaveTextContent('exploreMetric.queryCopied');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('reports clipboard failure without claiming success', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard denied')) }
    });
    render(<MetricExecutedQuery query={expression} t={t} />);
    openQuery();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'exploreMetric.copyQuery' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('exploreMetric.queryCopyFailed');
  });

  it.each(['replace', 'unmount'])('ignores late clipboard completion after %s', async change => {
    vi.useFakeTimers();
    let complete = () => {};
    const pending = new Promise<void>(resolve => {
      complete = resolve;
    });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => pending } });
    const view = render(<MetricExecutedQuery query={expression} t={t} />);
    openQuery();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.click(screen.getByRole('button', { name: 'exploreMetric.copyQuery' }));
    if (change === 'replace') view.rerender(<MetricExecutedQuery query="other_cpu" t={t} />);
    else view.unmount();
    await act(async () => {
      complete();
      await pending;
    });
    if (change === 'replace') expect(screen.getByRole('status')).toBeEmptyDOMElement();
    else expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
