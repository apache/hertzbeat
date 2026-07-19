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

import type { Monitor, MonitorGrafanaDashboard, MonitorParam } from './monitor-contract';

// The misspelling is the backend's legacy discovery sentinel; changing it breaks reread convergence.
export const MONITOR_DISCOVERY_INSTANCE = 'unknow';

export type MonitorMetricField = {
  field: string;
  unit: string;
  type: 0 | 1;
  label?: boolean;
  i18n?: Record<string, string>;
};
export type MonitorParamFormValue = string | number | boolean | Record<string, string> | MonitorMetricField[] | null;
export type MonitorParamDraft = Omit<MonitorParam, 'paramValue'> & { paramValue: MonitorParamFormValue };
export type MonitorEditorDraft = {
  monitor: Monitor;
  collector: string;
  params: MonitorParamDraft[];
  grafanaDashboard: MonitorGrafanaDashboard;
  invalidParamFields: string[];
};

export class MonitorParamDraftError extends Error {
  constructor(readonly field: string) {
    super(`Monitor parameter ${field} cannot be represented safely`);
    this.name = 'MonitorParamDraftError';
  }
}
