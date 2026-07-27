/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useSession } from '@/core/auth/session-context';

import { monitorCapabilities } from '../model/monitor-capability-model';

/** Maps the current session roles to monitor action permissions. */
export function useMonitorCapabilities() {
  return monitorCapabilities(useSession().session?.roles ?? []);
}
