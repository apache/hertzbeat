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
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { ExploreQuery, ExploreSignal } from '../model/explore-model';
import { ExploreWorkflowGuide } from './explore-workflow-guide';

describe('Explore workflow guide', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('uses a collapsed native disclosure without query actions', () => {
    const query = Object.freeze({ signal: 'logs', timeRange: 'last-30m' } as const);
    const { container } = render(<ExploreWorkflowGuide query={query} t={i18n.t} />);
    const disclosure = container.querySelector('details');
    const summary = screen.getByText(i18n.t('explore.workflowGuide.summary'));
    expect(disclosure).not.toHaveAttribute('open');
    expect(summary.tagName).toBe('SUMMARY');
    summary.focus();
    expect(summary).toHaveFocus();
    fireEvent.click(summary);
    expect(disclosure).toHaveAttribute('open');
    fireEvent.click(summary);
    expect(disclosure).not.toHaveAttribute('open');
    expect(container.querySelector('form, button, input, a')).toBeNull();
    expect(query).toEqual({ signal: 'logs', timeRange: 'last-30m' });
  });

  it.each<ExploreSignal>(['metrics', 'logs', 'traces'])('shows three truthful steps for %s', signal => {
    const { container } = render(<ExploreWorkflowGuide query={{ signal, timeRange: 'last-30m' }} t={i18n.t} />);
    fireEvent.click(screen.getByText(i18n.t('explore.workflowGuide.summary')));
    expect(i18n.exists(`explore.novice.${signal}.query`)).toBe(true);
    expect(i18n.exists(`explore.novice.${signal}.inspect`)).toBe(true);
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText(i18n.t(`explore.novice.${signal}.query`))).toBeInTheDocument();
    expect(within(list).getByText(i18n.t(`explore.novice.${signal}.inspect`))).toBeInTheDocument();
    expect(within(list).getByText(i18n.t('explore.workflowGuide.save'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('explore.workflowGuide.states'))).toBeInTheDocument();
    expect(container.querySelectorAll('details')).toHaveLength(1);
  });

  it.each(['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'pt-BR'] as const)(
    'explains literal body search inside the existing guide in %s',
    async locale => {
      await loadLocale(locale);
      expect(i18n.exists('explore.workflowGuide.logs.bodySearch')).toBe(true);
      const { rerender } = render(
        <ExploreWorkflowGuide query={{ signal: 'logs', timeRange: 'last-30m' }} t={i18n.t} />
      );
      fireEvent.click(screen.getByText(i18n.t('explore.workflowGuide.summary')));
      const help = screen.getByText(i18n.t('explore.workflowGuide.logs.bodySearch'));
      for (const example of ['error', 'ERROR', 'errors', 'OR']) expect(help).toHaveTextContent(example);
      rerender(<ExploreWorkflowGuide query={{ signal: 'metrics', timeRange: 'last-30m' }} t={i18n.t} />);
      expect(screen.queryByText(i18n.t('explore.workflowGuide.logs.bodySearch'))).not.toBeInTheDocument();
      await loadLocale('en-US');
    }
  );

  it.each([
    { signal: 'traces', traceId: 'a'.repeat(32), timeRange: 'last-30m', start: 1, end: 2, timeZone: 'UTC' },
    { signal: 'logs', logRecordUid: 'event-1', timeRange: 'last-30m', start: 1, end: 2, timeZone: 'UTC' }
  ] satisfies ExploreQuery[])('does not advertise absent query controls in focused investigations', query => {
    const { container } = render(<ExploreWorkflowGuide query={query} t={i18n.t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the guide for a trace ID used as a historical filter', () => {
    render(
      <ExploreWorkflowGuide query={{ signal: 'traces', traceId: 'a'.repeat(32), timeRange: 'last-30m' }} t={i18n.t} />
    );
    expect(screen.getByText(i18n.t('explore.workflowGuide.summary'))).toBeInTheDocument();
  });
});
