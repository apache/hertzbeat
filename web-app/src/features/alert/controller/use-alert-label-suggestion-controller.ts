/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { loadLabelSuggestions } from '@/features/settings';

import { buildAlertLabelSuggestionState } from '../model/alert-label-suggestion-model';
import { alertLabelSuggestionQueryKeys } from './alert-label-suggestion-query-keys';

export function useAlertLabelSuggestionController() {
  const query = useQuery({
    queryKey: alertLabelSuggestionQueryKeys.catalog(),
    queryFn: ({ signal }) => loadLabelSuggestions(signal),
    retry: false
  });
  if (query.data) return buildAlertLabelSuggestionState(query.data);
  return buildAlertLabelSuggestionState(undefined, query.isPending ? 'loading' : 'fallback');
}
