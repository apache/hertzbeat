/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export const managedPrometheusLimits = {
  targets: 32,
  headerReferences: 8,
  intervalSeconds: { minimum: 10, maximum: 300, defaultValue: 30 },
  timeoutSeconds: { minimum: 1, maximum: 60, defaultValue: 10 }
} as const;

type ManagedPrometheusHeaderReferenceDraft = {
  headerName: string;
  secretReferenceName: string;
};

export type ManagedPrometheusTargetDraft = {
  name: string;
  endpoint: string;
  intervalSeconds: number;
  timeoutSeconds: number;
  headerSecretRefs: readonly ManagedPrometheusHeaderReferenceDraft[];
  tlsCaProfile: string;
};

export type ManagedPrometheusTargetSelection = number | 'new' | null;

export type ManagedPrometheusSourceView = {
  targets: readonly ManagedPrometheusTargetDraft[];
  selection: ManagedPrometheusTargetSelection;
};

export function selectPrometheusTarget(
  view: ManagedPrometheusSourceView,
  selection: ManagedPrometheusTargetSelection
): ManagedPrometheusSourceView | null {
  if (selection === 'new' && view.targets.length >= managedPrometheusLimits.targets) return null;
  if (typeof selection === 'number' && !view.targets[selection]) return null;
  return { ...view, selection };
}

export function applyPrometheusTarget(
  view: ManagedPrometheusSourceView,
  target: ManagedPrometheusTargetDraft
): ManagedPrometheusSourceView | null {
  if (view.selection === null) return null;
  if (view.selection === 'new' && view.targets.length >= managedPrometheusLimits.targets) return null;
  if (typeof view.selection === 'number' && !view.targets[view.selection]) return null;
  const targets = [...view.targets];
  if (view.selection === 'new') targets.push(target);
  else targets[view.selection] = target;
  return { targets, selection: null };
}

export function removePrometheusTarget(
  view: ManagedPrometheusSourceView,
  index: number
): ManagedPrometheusSourceView | null {
  if (!view.targets[index]) return null;
  return { targets: view.targets.filter((_target, candidate) => candidate !== index), selection: null };
}

export function cancelPrometheusTarget(view: ManagedPrometheusSourceView): ManagedPrometheusSourceView {
  return { ...view, selection: null };
}
