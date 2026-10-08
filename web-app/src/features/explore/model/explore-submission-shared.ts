/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExploreQueryPatch } from './explore-query';
import type { SharedExploreSubmissionDraft } from './explore-submission-types';
import { readValue } from './explore-url-values';

export function sharedSubmissionPatch(draft: SharedExploreSubmissionDraft): ExploreQueryPatch {
  return {
    serviceName: readValue(draft.serviceName),
    serviceNamespace: readValue(draft.serviceNamespace),
    environment: readValue(draft.environment),
    instance: readValue(draft.instance),
    endpoint: readValue(draft.endpoint),
    query: readValue(draft.query)
  };
}
