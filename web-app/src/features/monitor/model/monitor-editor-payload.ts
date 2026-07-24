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

import type { Monitor, MonitorGrafanaDashboard, MonitorParamDefine } from './monitor-contract';
import { MONITOR_DISCOVERY_INSTANCE, MonitorParamDraftError, type MonitorParamDraft } from './monitor-editor-model';
import { serializeMonitorParamValue } from './monitor-param-codec';

export function buildMonitorPayload(
  monitor: Partial<Monitor>,
  collector: string,
  params: MonitorParamDraft[],
  defines: MonitorParamDefine[] = [],
  grafanaDashboard?: MonitorGrafanaDashboard | null
) {
  const defineMap = new Map(defines.map(define => [define.field, define]));
  const serializedParams = params.map(param => {
    const define = defineMap.get(param.field);
    return { ...param, paramValue: serializeParamDraft(param, define) };
  });
  const host = serializedParams.find(param => param.field === 'host')?.paramValue;
  return {
    monitor: {
      ...monitor,
      name: monitor.name?.trim(),
      labels: monitor.labels ?? {},
      annotations: monitor.annotations ?? {},
      // The backend owns static port concatenation; including it here makes edit append the same port twice.
      instance: submittedMonitorInstance(monitor.scrape, host)
    },
    collector: collector.trim() || null,
    params: serializedParams,
    grafanaDashboard: grafanaDashboard ?? {
      monitorId: null,
      folderUid: null,
      slug: null,
      status: null,
      uid: null,
      url: null,
      version: null,
      enabled: false,
      template: null
    }
  };
}

export type MonitorMutationPayload = ReturnType<typeof buildMonitorPayload>;

function serializeParamDraft(param: MonitorParamDraft, define: MonitorParamDefine | undefined): string | null {
  if (define) return serializeMonitorParamValue(define, param.paramValue);
  if (param.paramValue === null || typeof param.paramValue === 'string') return param.paramValue;
  throw new MonitorParamDraftError(param.field);
}

function submittedMonitorInstance(scrape: string | null | undefined, host: string | null | undefined) {
  if (scrape && scrape !== 'static') return MONITOR_DISCOVERY_INSTANCE;
  return host?.trim() ?? '';
}
