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
import { buildHistoryMetricPath } from './monitor-metric-api';

describe('monitor history path', () => {
  it('keeps a dotted Prometheus monitor name in one structured application parameter', () => {
    const monitor = {
      id: 7,
      app: 'prometheus',
      name: 'node.prod.example',
      instance: 'example.com:9090',
      status: 1
    };
    const metric = {
      key: 'system.cpu_usage',
      group: 'system',
      field: 'cpu_usage',
      unit: '%'
    };

    expect(buildHistoryMetricPath(monitor, metric, '30m', false)).toBe(
      '/api/monitor/example.com%3A9090/metric?app=_prometheus_node.prod.example&metrics=system&metric=cpu_usage&history=30m&interval=false'
    );
  });
});
