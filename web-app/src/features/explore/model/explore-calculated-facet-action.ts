/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { structuredFacetAction } from './explore-log-structured-facet-action';
import { ExploreSignalContractError } from './explore-signal-contract';
import type { LogExploreQuery } from './explore-query';
import type { LogExploreSubmissionDraft } from './explore-submission-model';

export function calculatedFacetSelection(
  draft: LogExploreSubmissionDraft,
  scope: LogExploreQuery,
  field: string,
  value: string | number | boolean,
  intent: 'single' | 'toggle'
) {
  const name = field.startsWith('calculated:') ? field.slice('calculated:'.length) : '';
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(name) || (typeof value === 'number' && !Number.isFinite(value)))
    throw new ExploreSignalContractError('Invalid calculated facet selection');
  return structuredFacetAction(draft, scope, undefined, String(value), '=', intent, `#${name}`);
}
