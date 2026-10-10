/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
