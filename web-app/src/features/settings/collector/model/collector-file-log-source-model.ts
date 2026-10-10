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
