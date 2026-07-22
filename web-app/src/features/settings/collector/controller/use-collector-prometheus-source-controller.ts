/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  buildManagedOtelPrometheusTargetsUpdate,
  managedOtelPrometheusTargetDraft
} from '../api/collector-prometheus-source-schema';
import {
  applyPrometheusTarget,
  cancelPrometheusTarget,
  removePrometheusTarget,
  selectPrometheusTarget,
  type ManagedPrometheusSourceView,
  type ManagedPrometheusTargetDraft,
  type ManagedPrometheusTargetSelection
} from '../model/collector-prometheus-source-model';
import { useCollectorRuntimeSourceSession, type RuntimeSourceAdapter } from './use-collector-runtime-source-session';

type Options = Omit<Parameters<typeof useCollectorRuntimeSourceSession<ManagedPrometheusSourceView>>[0], 'adapter'>;

const adapter: RuntimeSourceAdapter<ManagedPrometheusSourceView> = {
  read: current => ({
    targets: current.prometheusTargets.map(managedOtelPrometheusTargetDraft),
    selection: null
  }),
  buildUpdate: (current, draft) => buildManagedOtelPrometheusTargetsUpdate(current, draft.targets),
  successKey: 'collectors.runtime.prometheus.success'
};

export function useCollectorPrometheusSourceController(options: Options) {
  const source = useCollectorRuntimeSourceSession({ ...options, adapter });
  const draft = source.editor?.draft ?? null;
  const select = (selection: ManagedPrometheusTargetSelection) => {
    if (!draft) return;
    const next = selectPrometheusTarget(draft, selection);
    if (next) source.replaceDraft(next);
  };
  const apply = (target: ManagedPrometheusTargetDraft) => {
    if (!source.editor) return;
    const next = applyPrometheusTarget(source.editor.draft, target);
    if (!next || !buildManagedOtelPrometheusTargetsUpdate(source.editor.current, next.targets)) {
      source.reject();
      return;
    }
    source.replaceDraft(next);
  };
  const remove = (index: number) => {
    if (!draft) return;
    const next = removePrometheusTarget(draft, index);
    if (next) source.replaceDraft(next);
  };
  const cancelTarget = () => {
    if (draft) source.replaceDraft(cancelPrometheusTarget(draft));
  };
  const editor = source.editor
    ? { record: source.editor.record, targets: source.editor.draft.targets, selection: source.editor.draft.selection }
    : null;
  return { ...source, editor, select, apply, remove, cancelTarget };
}
