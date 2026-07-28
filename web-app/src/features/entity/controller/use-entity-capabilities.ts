/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useSession } from '@/core/auth/session-context';
import { entityCapabilities } from '../model/entity-capability-model';

export function useEntityCapabilities() {
  return entityCapabilities(useSession().session?.roles ?? []);
}
