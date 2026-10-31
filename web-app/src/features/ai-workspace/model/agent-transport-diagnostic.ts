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

import { z } from 'zod';

const transportFailureSchema = z.object({
  requestId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  code: z.enum([
    'QUEUE_TIMEOUT',
    'HEADER_TIMEOUT',
    'REQUEST_PREPARATION_FAILED',
    'HTTP_REJECTED',
    'TRANSPORT_FAILURE',
    'STREAM_CONTRACT',
    'STREAM_READ_FAILED'
  ]),
  httpStatus: z.number().int().min(100).max(599).optional()
});
export type AgentTransportFailure = z.infer<typeof transportFailureSchema>;

/** Only closed diagnostic fields reach the UI, never exception messages. */
export function agentTransportFailure(error: unknown): AgentTransportFailure | undefined {
  try {
    if (!error || typeof error !== 'object' || !('transportFailure' in error)) return undefined;
    const result = transportFailureSchema.safeParse(error.transportFailure);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
