/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { LabelSuggestionCatalog } from '@/shared/labels/label-suggestion-model';

const defaultAlertLabelKeys = ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env'] as const;

export type AlertLabelSuggestionState = {
  kind: 'loading' | 'received' | 'fallback';
  keys: string[];
  catalog?: LabelSuggestionCatalog;
};

/** Keeps manual authoring useful while enriching it with canonical Label records. */
export function buildAlertLabelSuggestionState(
  catalog?: LabelSuggestionCatalog,
  kind: AlertLabelSuggestionState['kind'] = catalog ? 'received' : 'fallback'
): AlertLabelSuggestionState {
  const normalizedCatalog = catalog ? normalizeLabelSuggestionCatalog(catalog) : undefined;
  const keys: string[] = [...defaultAlertLabelKeys];
  const seen = new Set<string>(keys);
  normalizedCatalog?.keys.forEach(key => {
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  });
  return { kind, keys, ...(normalizedCatalog ? { catalog: normalizedCatalog } : {}) };
}

function normalizeLabelSuggestionCatalog(catalog: LabelSuggestionCatalog): LabelSuggestionCatalog {
  const keys: string[] = [];
  const valuesByKey: Record<string, string[]> = {};
  const seenKeys = new Set<string>();
  catalog.keys.forEach(candidate => {
    const key = candidate.trim();
    if (!key || seenKeys.has(key)) return;
    seenKeys.add(key);
    keys.push(key);
    const values = catalog.valuesByKey[candidate] ?? catalog.valuesByKey[key] ?? [];
    valuesByKey[key] = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  });
  return { keys, valuesByKey };
}
