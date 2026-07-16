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

import pageSource from './monitor-detail-page.tsx?raw';
import viewSource from '../components/monitor-detail-view.tsx?raw';
import workbenchSource from '../components/monitor-metric-workbench.tsx?raw';

describe('Monitor Detail page architecture', () => {
  it('keeps the page as controller and pure-view composition', () => {
    expect(pageSource).toMatch(/useMonitorDetailController/);
    expect(pageSource).toMatch(/MonitorDetailView/);
    expect(pageSource).not.toMatch(/@tanstack|monitor-api|react-router|useParams|useSearchParams|useNavigate/);
  });

  it('keeps transport, Router, and controller ownership out of the view', () => {
    expect(viewSource).not.toMatch(/@tanstack|monitor-api|react-router|useMonitorDetailController|\.\.\/pages\//);
  });

  it('keeps the metric workbench as a pure presentation boundary', () => {
    expect(workbenchSource).not.toMatch(/@tanstack|monitor-api|react-router|useMonitorMetricWorkbenchController/);
  });
});
