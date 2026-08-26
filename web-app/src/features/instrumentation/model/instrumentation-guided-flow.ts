/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { ServiceIdentity } from './instrumentation-v2-contract';

export const INSTRUMENTATION_CONFIGURE_PHASES = ['service', 'destination', 'guide'] as const;
export type InstrumentationConfigurePhase = (typeof INSTRUMENTATION_CONFIGURE_PHASES)[number];

export function serviceConfigurationReady(
  service: ServiceIdentity,
  platform: string | undefined,
  platformOptions: string[]
) {
  return Boolean(
    service.name.trim() &&
    service.namespace.trim() &&
    service.environment.trim() &&
    (platformOptions.length <= 1 || platform)
  );
}
