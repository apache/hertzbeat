/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useSession } from '@/core/auth/session-context';

import { systemConfigActionCapabilities } from '../model/system-config-action-capability';

export function useSystemConfigActionCapabilities() {
  return systemConfigActionCapabilities(useSession().session?.roles ?? []);
}
