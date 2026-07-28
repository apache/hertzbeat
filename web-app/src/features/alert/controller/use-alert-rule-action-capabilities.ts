/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useSession } from '@/core/auth/session-context';

import { alertActionCapabilities } from '../model/alert-action-capability';

export function useAlertRuleActionCapabilities() {
  return alertActionCapabilities(useSession().session?.roles ?? []);
}
