/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertRuleDatasource, AlertRuleType } from './alert-rule-types';

export type AlertRuleWritableSnapshot = {
  type: AlertRuleType | null;
  datasource: AlertRuleDatasource | null;
  expr: string | null;
  period: number | null;
  times: number | null;
  labels: Record<string, string> | null;
  template: string | null;
};
