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

import { MonitorDetailView } from '../components/monitor-detail-view';
import { MonitorMetricWorkbench } from '../components/monitor-metric-workbench';
import { useMonitorDetailController } from '../controller/use-monitor-detail-controller';
import { useMonitorMetricWorkbenchController } from '../controller/use-monitor-metric-workbench-controller';

export function MonitorDetailPage() {
  const detail = useMonitorDetailController();
  const ready = detail.state.detail.kind === 'ready' ? detail.state.detail.detail : undefined;
  const metrics = useMonitorMetricWorkbenchController(ready?.monitor, ready?.metrics ?? []);
  return <MonitorDetailView {...detail}
    metricWorkbench={ready ? <MonitorMetricWorkbench {...metrics} /> : undefined}
  />;
}
