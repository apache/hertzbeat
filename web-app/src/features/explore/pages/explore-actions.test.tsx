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

import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { ExploreActions } from './explore-actions';
vi.mock('../components/explore-share-action', () => ({ ExploreShareAction: () => <button>Share</button> }));
vi.mock('../components/explore-dashboard-action', () => ({ ExploreDashboardAction: () => <button>Dashboard</button> }));
vi.mock('../components/explore-saved-query-actions', () => ({
  ExploreSavedQueryActions: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
it('keeps removed utilities absent in focused log investigations too', () => {
  const props = {
    controller: { query: { signal: 'logs', logRecordUid: 'record' }, result: {}, transactions: {} },
    savedQueries: {}
  } as unknown as ComponentProps<typeof ExploreActions>;
  render(<ExploreActions {...props} />);
  expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
});
