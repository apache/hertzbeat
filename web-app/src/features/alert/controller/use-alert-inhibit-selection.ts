/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useAuthoritativePageSelection } from '@/shared/table-selection';

import { writeAlertInhibitQuery, type AlertInhibitQuery } from '../model/alert-inhibit-model';
import type { AlertInhibitListState } from '../model/alert-inhibit-state';

export function useAlertInhibitSelection(query: AlertInhibitQuery, list: AlertInhibitListState) {
  return useAuthoritativePageSelection(writeAlertInhibitQuery(query).toString(), list);
}
