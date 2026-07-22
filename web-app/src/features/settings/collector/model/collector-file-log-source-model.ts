/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export const managedFileLogLimits = { sources: 16 } as const;

export type ManagedFileLogSourceDraft = { name: string; pathProfile: string };
export type ManagedFileLogSourceSelection = number | 'new' | null;
export type ManagedFileLogSourceView = {
  sources: readonly ManagedFileLogSourceDraft[];
  selection: ManagedFileLogSourceSelection;
};

export function selectFileLogSource(
  view: ManagedFileLogSourceView,
  selection: ManagedFileLogSourceSelection
): ManagedFileLogSourceView | null {
  if (selection === 'new' && view.sources.length >= managedFileLogLimits.sources) return null;
  if (typeof selection === 'number' && !view.sources[selection]) return null;
  return { ...view, selection };
}

export function applyFileLogSource(
  view: ManagedFileLogSourceView,
  source: ManagedFileLogSourceDraft
): ManagedFileLogSourceView | null {
  if (view.selection === null) return null;
  if (view.selection === 'new' && view.sources.length >= managedFileLogLimits.sources) return null;
  if (typeof view.selection === 'number' && !view.sources[view.selection]) return null;
  const sources = [...view.sources];
  if (view.selection === 'new') sources.push(source);
  else sources[view.selection] = source;
  return { sources, selection: null };
}

export function removeFileLogSource(view: ManagedFileLogSourceView, index: number): ManagedFileLogSourceView | null {
  if (!view.sources[index]) return null;
  return { sources: view.sources.filter((_source, candidate) => candidate !== index), selection: null };
}

export function cancelFileLogSource(view: ManagedFileLogSourceView): ManagedFileLogSourceView {
  return { ...view, selection: null };
}
