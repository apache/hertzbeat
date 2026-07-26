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

import type { MonitorAction, MonitorQuery } from './monitor-contract';
import type { MonitorExportFormat } from './monitor-export-model';
import type { MonitorImportState } from './monitor-import-model';
import type { MonitorListRow } from './monitor-list-snapshot';

export type MonitorListEvidence = RemotePageState<MonitorListRow, 'unavailable' | 'error'>;

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
  canExport: boolean;
  monitorImport: MonitorImportState;
};

export type MonitorListViewActions = {
  setSearch: (value: string) => void;
  setLabels: (value: string) => void;
  submitSearch: () => void;
  submitFilters: () => void;
  changeApp: (value: string) => void;
  changeStatus: (value: string) => void;
  changeSort: (sort: MonitorQuery['sort'], order: MonitorQuery['order']) => void;
  changePage: (page: number, pageSize: number) => void;
  refresh: () => Promise<boolean>;
  create: () => void;
  open: (id: number, mode: 'view' | 'edit') => void;
  run: (action: MonitorAction, ids: number[]) => void | Promise<void>;
  runBulk: (action: MonitorAction) => void | Promise<void>;
  exportSelected: (format: MonitorExportFormat) => Promise<boolean>;
  exportAll: (format: MonitorExportFormat) => Promise<boolean>;
  openImport: () => void;
  cancelImport: () => void;
  selectImportFile: (file: File | null) => void;
  submitImport: () => Promise<boolean>;
  copyInstance: (instance: string) => Promise<boolean>;
  selectIds: (ids: number[]) => void;
  clearSelection: () => void;
};
