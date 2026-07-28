/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useSession } from '@/core/auth/session-context';

import { alertRuleActionCapabilities } from '../model/alert-rule-action-capability';

export function useAlertRuleActionCapabilities() {
  return alertRuleActionCapabilities(useSession().session?.roles ?? []);
}
