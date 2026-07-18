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

import type { RemotePageState, RemotePayloadState } from '@/shared/remote-state';

import type { Monitor, MonitorAction } from '../api/monitor-api';
import type { MonitorQuery } from './monitor-model';

export type MonitorListEvidence = RemotePageState<Monitor, 'unavailable' | 'error'>;

export type MonitorAppsEvidence = RemotePayloadState<
  { options: Array<{ value: string; label: string }> },
  'unavailable' | 'error'
>;

export type MonitorListViewState = {
  query: MonitorQuery;
  draft: { search: string; labels: string };
  operating: boolean;
  selectedIds: number[];
  monitors: MonitorListEvidence;
  apps: MonitorAppsEvidence;
  refreshing: boolean;
};

export type MonitorListViewActions = {
  setSearch: (value: string) => void;
  setLabels: (value: string) => void;
  submitSearch: () => void;
  submitFilters: () => void;
  changeApp: (value: string) => void;
  changeStatus: (value: string) => void;
  changePage: (page: number, pageSize: number) => void;
  refresh: () => Promise<boolean>;
  create: () => void;
  open: (id: number, mode: 'view' | 'edit') => void;
  run: (action: MonitorAction, ids: number[]) => void | Promise<void>;
  runBulk: (action: MonitorAction) => void | Promise<void>;
  selectIds: (ids: number[]) => void;
};
