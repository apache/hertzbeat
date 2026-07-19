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

import { describe, expect, it } from 'vitest';

import { MonitorContractError, type MonitorQuery } from '../model/monitor-contract';
import { parseMonitorApps } from './monitor-apps-schema';
import { parseMonitorDetail } from './monitor-detail-schema';
import { parseMonitorPage } from './monitor-page-schema';

const query: MonitorQuery = {
  search: '',
  app: '',
  status: '9',
  labels: '',
  pageIndex: 0,
  pageSize: 10
};

describe('Monitor primary read schemas', () => {
  it('keeps current LocalDateTime text and documented legacy numeric timestamps', () => {
    const page = parseMonitorPage(
      {
        content: [
          {
            id: 7,
            name: 'checkout',
            app: 'website',
            instance: 'prod',
            status: 1,
            labels: { environment: 'production', team: 'payments' },
            gmtCreate: '2026-07-18T10:30:00',
            gmtUpdate: 1_650_000_000_000
          }
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 10
      },
      query
    );

    expect(page.content[0]).toMatchObject({
      labels: { environment: 'production', team: 'payments' },
      gmtCreate: '2026-07-18T10:30:00',
      gmtUpdate: 1_650_000_000_000
    });
  });

  it('enforces nested detail identities before returning mapped evidence', () => {
    expect(() =>
      parseMonitorDetail(
        {
          monitor: detailMonitor(),
          params: [
            {
              id: 4,
              monitorId: 8,
              field: 'host',
              type: 1,
              paramValue: null,
              gmtCreate: null,
              gmtUpdate: null
            }
          ],
          collector: null,
          grafanaDashboard: null,
          metrics: []
        },
        7
      )
    ).toThrow(MonitorContractError);
  });

  it('maps only the app option fields used by monitor selection', () => {
    expect(
      parseMonitorApps([
        {
          category: 'http',
          value: 'website',
          label: 'Website',
          hide: false,
          children: ['ignored']
        }
      ])
    ).toEqual([
      {
        category: 'http',
        value: 'website',
        label: 'Website',
        hide: false
      }
    ]);
  });
});

function detailMonitor() {
  return {
    id: 7,
    jobId: 9,
    name: 'checkout',
    app: 'website',
    scrape: null,
    instance: 'prod',
    intervals: null,
    scheduleType: null,
    cronExpression: null,
    status: 1,
    type: 2,
    labels: null,
    annotations: null,
    description: null,
    creator: null,
    modifier: null,
    gmtCreate: null,
    gmtUpdate: null
  };
}
