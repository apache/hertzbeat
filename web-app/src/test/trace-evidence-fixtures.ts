/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { TraceEvidence } from '@/shared/trace-evidence';

export function traceEvidenceFixture(overrides: Partial<TraceEvidence> = {}): TraceEvidence {
  return {
    traceId: '0123456789abcdef0123456789abcdef',
    rootSpanId: '0123456789abcdef',
    serviceName: 'checkout',
    serviceNamespace: 'commerce',
    rootSpanName: 'POST /orders',
    startTime: 1_750_000_000_000,
    durationNanos: 100_000,
    status: 'unset',
    errorSpanCount: 0,
    resourceAttributes: {},
    spanCount: 1,
    serviceStats: { checkout: { spanCount: 1, errorCount: 0 } },
    rootState: 'unique',
    rootSpanCount: 1,
    unattributedServiceStats: null,
    representativeSpan: {
      spanId: '0123456789abcdef',
      spanName: 'POST /orders',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      startTime: 1_750_000_000_000,
      durationNanos: 100_000
    },
    observedStartTime: 1_750_000_000_000,
    observedEndTime: 1_750_000_000_001,
    ...overrides
  };
}
