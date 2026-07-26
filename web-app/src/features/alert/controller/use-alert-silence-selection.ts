/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useAuthoritativePageSelection } from '@/shared/table-selection';

import { writeAlertSilenceQuery, type AlertSilenceQuery } from '../model/alert-silence-model';
import type { AlertSilenceListEvidence } from '../model/alert-silence-page-model';

export function useAlertSilenceSelection(query: AlertSilenceQuery, list: AlertSilenceListEvidence) {
  return useAuthoritativePageSelection(writeAlertSilenceQuery(query).toString(), list);
}
