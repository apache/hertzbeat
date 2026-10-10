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

import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useLogInvestigationController } from '../controller/use-log-investigation-controller';
import { ExploreLogContext as ExploreLogContextPane } from './explore-log-context';
import type { LogRow } from '../model/explore-signal-contract';
vi.mock('../controller/use-log-investigation-controller', () => ({ useLogInvestigationController: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const row = { logRecordUid: 'selected' } as LogRow;
const props = {
  query: {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: 'error',
    severityCategory: 'ERROR',
    traceId: 'filtered'
  },
  row,
  timeWindow: { from: 100000, to: 200000 },
  evidenceCurrent: true
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('uses the persisted UID and exact window while preserving the parent route', () => {
  vi.mocked(useLogInvestigationController).mockReturnValue({
    state: { kind: 'loading', route: {} as never },
    evidenceCurrent: false,
    refetch: async () => {}
  });
  render(<ExploreLogContextPane {...props} />);
  expect(useLogInvestigationController).toHaveBeenCalledWith(
    expect.objectContaining({
      logRecordUid: 'selected',
      start: 100000,
      end: 200000,
      traceId: undefined,
      spanId: undefined
    })
  );
  expect(screen.getByText('explore.logContext.loading')).toBeInTheDocument();
  expect(props.query.traceId).toBe('filtered');
});
it('does not show cached context during refresh', () => {
  vi.mocked(useLogInvestigationController).mockReturnValue({
    state: { kind: 'ready', snapshot: {} } as never,
    evidenceCurrent: false,
    refetch: async () => {}
  });
  render(<ExploreLogContextPane {...props} />);
  expect(screen.getByText('explore.logContext.loading')).toBeInTheDocument();
});
it('keeps the anchor between chronological neighbors and marks bounded context', () => {
  const log = (id: string, time: string, body: string) => ({
    logRecordUid: id,
    timeUnixNano: time,
    body,
    severityText: 'INFO'
  });
  vi.mocked(useLogInvestigationController).mockReturnValue({
    state: {
      kind: 'ready',
      snapshot: {
        selectedLog: { state: 'ready', log: log('selected', '150000000000', 'anchor body') },
        nearbyLogs: {
          state: 'ready',
          before: [log('b2', '140000000000', 'later before'), log('b1', '130000000000', 'earlier before')],
          after: [log('a1', '160000000000', 'after body')],
          hasMoreBefore: true,
          hasMoreAfter: false
        }
      }
    } as never,
    evidenceCurrent: true,
    refetch: async () => {}
  });
  render(<ExploreLogContextPane {...props} />);
  const items = screen.getAllByRole('listitem');
  expect(items.map(item => item.querySelector('p')?.textContent)).toEqual([
    'earlier before',
    'later before',
    'anchor body',
    'after body'
  ]);
  expect(items[2]).toHaveAttribute('data-context-anchor', 'true');
  expect(screen.getByText('explore.logContext.moreBefore')).toBeInTheDocument();
  expect(screen.queryByText('explore.logContext.moreAfter')).not.toBeInTheDocument();
});

it('uses the list summary for a selected event with a null body and explains missing nearby identity', () => {
  vi.mocked(useLogInvestigationController).mockReturnValue({
    state: {
      kind: 'ready',
      snapshot: {
        selectedLog: {
          state: 'ready',
          log: {
            logRecordUid: 'selected',
            timeUnixNano: '150000000000',
            body: 'null',
            attributes: { 'event.name': 'request event' }
          }
        },
        nearbyLogs: {
          state: 'unavailable',
          reason: 'identity_unavailable',
          before: [],
          after: [],
          hasMoreBefore: false,
          hasMoreAfter: false
        }
      }
    } as never,
    evidenceCurrent: true,
    refetch: async () => {}
  });
  render(<ExploreLogContextPane {...props} />);
  expect(screen.getByText('null')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('explore.logContext.identityUnavailable');
});
