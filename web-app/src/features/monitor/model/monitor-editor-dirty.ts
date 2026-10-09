/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
