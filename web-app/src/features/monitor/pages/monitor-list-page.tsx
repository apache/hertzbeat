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

import { MonitorListView } from '../components/monitor-list-view';
import { MonitorReadPermissionState } from '../components/monitor-read-permission-state';
import { useMonitorCapabilities } from '../controller/use-monitor-capabilities';
import { useMonitorListController } from '../controller/use-monitor-list-controller';

export function MonitorListPage() {
  const capabilities = useMonitorCapabilities();
  if (!capabilities.canRead) return <MonitorReadPermissionState />;
  // Controller ownership lives below this gate so role loss unmounts every
  // query, interval, and cached view before denied content can render.
  return <MonitorListWorkspace />;
}

function MonitorListWorkspace() {
  const controller = useMonitorListController();
  return <MonitorListView {...controller} />;
}
