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

import type { AgentTransportFailure } from '../model/agent-transport-diagnostic';

export class AgentGatewayRequestError extends Error {
  constructor(
    readonly kind: 'unavailable' | 'http' | 'contract',
    readonly status?: number,
    readonly transportFailure?: AgentTransportFailure
  ) {
    super('Agent Gateway request failed');
    this.name = 'AgentGatewayRequestError';
  }
}

export function parse<T>(schema: { parse: (value: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch {
    throw new AgentGatewayRequestError('contract');
  }
}

export function isAbort(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}
