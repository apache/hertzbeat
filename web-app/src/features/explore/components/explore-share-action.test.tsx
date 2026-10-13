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
import { afterEach, expect, it, vi } from 'vitest';
import { ExploreShareAction } from './explore-share-action';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);

it('describes a live share as a stream rather than a relative historical window', async () => {
  render(
    <ExploreShareAction
      query={{ signal: 'logs', live: true, timeRange: 'last-30m' }}
      timeWindow={undefined}
      timeZone="UTC"
      dirty={false}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.share.action' }));
  expect(await screen.findByRole('menuitem', { name: 'explore.share.live' })).not.toHaveAttribute(
    'aria-disabled',
    'true'
  );
  expect(screen.queryByRole('menuitem', { name: 'explore.share.relative' })).not.toBeInTheDocument();
});
