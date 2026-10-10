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

import type { HertzBeatDashboardDocument } from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { DashboardEditor } from './signal-dashboard-editor-model';
import type { SignalDashboardRecord } from './signal-dashboard-record';
import type { DashboardQueryControls, DashboardVariables } from './signal-dashboard-view-query';
import type { IncomingDashboardPanel } from './signal-dashboard-handoff';

type DashboardViewState = {
  runtimeIdentity: string;
  records: SignalDashboardRecord[];
  listState: 'loading' | 'error' | 'ready';
  active: SignalDashboardRecord | undefined;
  selectedKey: string | undefined;
  document: HertzBeatDashboardDocument | undefined;
  preview: HertzBeatDashboardDocument | undefined;
  editor: DashboardEditor | undefined;
  incoming: IncomingDashboardPanel | undefined;
  busy: boolean;
  canWrite: boolean;
  error: string | undefined;
  validationError: boolean;
  controls: DashboardQueryControls;
  variables: DashboardVariables;
  timeWindow: ExactTimeWindow | undefined;
  timeZone: string;
  fixedTime: boolean;
  validView: boolean;
  refreshRevision: number;
  returnPath: string | undefined;
};
export type DashboardViewActions = {
  open: (key?: string) => void;
  begin: (mode: 'new' | 'edit' | 'copy' | 'upgrade') => void;
  update: (document: HertzBeatDashboardDocument) => void;
  cancel: () => void;
  save: () => Promise<void>;
  remove: (record: SignalDashboardRecord) => Promise<void>;
  reload: () => Promise<void>;
  refresh: () => void;
  refreshDirectory: () => void;
  query: () => void;
  controls: (value: DashboardQueryControls) => void;
  importDocument: (text: string, asCopy: boolean) => boolean;
  receive: (key?: string) => void;
  dismissIncoming: () => void;
};
export type DashboardViewProps = { state: DashboardViewState; actions: DashboardViewActions };
