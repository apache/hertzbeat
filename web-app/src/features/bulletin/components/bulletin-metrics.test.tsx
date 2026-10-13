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

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { BulletinMetricsPanel } from './bulletin-metrics';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Bulletin metrics table', () => {
  afterEach(cleanup);

  it('renders one monitor row beneath grouped metric and field headers', () => {
    render(
      <MemoryRouter>
        <BulletinMetricsPanel
          state={{
            kind: 'ready',
            data: {
              name: 'Database',
              content: [
                {
                  monitorName: 'primary',
                  monitorId: 7,
                  host: 'db.local',
                  metrics: [
                    {
                      name: 'basic',
                      fields: [
                        [
                          { key: 'version', unit: '', value: '8.0', status: 'value' },
                          { key: 'port', unit: '', value: '3306', status: 'value' }
                        ]
                      ]
                    }
                  ]
                }
              ]
            }
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('columnheader', { name: 'basic' })).toHaveAttribute('colspan', '2');
    expect(screen.getByRole('columnheader', { name: 'version' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'port' })).toBeInTheDocument();
    const monitorRow = screen.getByRole('row', { name: /primary db\.local 8\.0 3306/ });
    expect(within(monitorRow).getByRole('link', { name: 'primary' })).toHaveAttribute('href', '/monitors/7');
    expect(screen.queryByRole('columnheader', { name: 'bulletin.metrics.metric' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'bulletin.metrics.field' })).not.toBeInTheDocument();
  });
});
