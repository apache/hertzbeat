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
};

/** Keeps manual authoring useful while enriching it with canonical Label records. */
export function buildAlertLabelSuggestionState(
  catalog?: LabelSuggestionCatalog,
  kind: AlertLabelSuggestionState['kind'] = catalog ? 'received' : 'fallback'
): AlertLabelSuggestionState {
  const keys: string[] = [...defaultAlertLabelKeys];
  const seen = new Set<string>(keys);
  catalog?.keys.forEach(candidate => {
    const key = candidate.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    keys.push(key);
  });
  return { kind, keys };
}
