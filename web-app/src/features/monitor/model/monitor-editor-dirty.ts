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

import isEqual from 'lodash/isEqual';

import type { MonitorParamDefine } from './monitor-contract';
import type { MonitorEditorDraft } from './monitor-editor-model';

/** Compare display restoration without changing the draft or its submitted null/empty values. */
export function monitorEditorDraftIsDirty(
  draft: MonitorEditorDraft,
  baseline: MonitorEditorDraft,
  defines: MonitorParamDefine[]
) {
  return !isEqual(displayDraft(draft, defines), displayDraft(baseline, defines));
}

function displayDraft(draft: MonitorEditorDraft, defines: MonitorParamDefine[]) {
  const textFields = new Set(
    defines
      .filter(define => ['text', 'host', 'password', 'textarea', 'array'].includes(define.type))
      .map(define => define.field)
  );
  return {
    ...draft,
    monitor: {
      ...draft.monitor,
      description: draft.monitor.description ?? '',
      cronExpression: draft.monitor.cronExpression ?? ''
    },
    grafanaDashboard: { ...draft.grafanaDashboard, template: draft.grafanaDashboard.template ?? '' },
    params: draft.params.map(param =>
      textFields.has(param.field) && param.paramValue === null ? { ...param, paramValue: '' } : param
    )
  };
}
