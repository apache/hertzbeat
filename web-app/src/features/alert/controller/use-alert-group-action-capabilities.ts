/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useSession } from '@/core/auth/session-context';

import { alertGroupActionCapabilities } from '../model/alert-group-action-capability';

export function useAlertGroupActionCapabilities() {
  return alertGroupActionCapabilities(useSession().session?.roles ?? []);
}
