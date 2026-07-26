/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useAuthoritativePageSelection } from '@/shared/table-selection';

import { writeAlertRuleQuery, type AlertRuleListState, type AlertRuleQuery } from '../model/alert-rule-model';

/** Keeps selection scoped to one authoritative rule-list projection. */
export function useAlertRuleSelection(query: AlertRuleQuery, list: AlertRuleListState) {
  return useAuthoritativePageSelection(writeAlertRuleQuery(query).toString(), list);
}
