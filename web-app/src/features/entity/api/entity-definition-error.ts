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

import { ApiMessageError } from '@/core/http/api-message';
import { EntityContractError } from '../model/entity-contract';
import type { EntityDefinitionFailure } from '../model/entity-definition-model';

export function classifyEntityDefinitionError(error: unknown): EntityDefinitionFailure {
  if (error instanceof EntityContractError) return { kind: 'contract' };
  if (error instanceof ApiMessageError) {
    if (error.code === 3 || error.status === 404) return { kind: 'missing' };
    if (error.status === 401 || error.status === 403) return { kind: 'permission' };
    if (error.code === 1) return { kind: 'validation' };
    if (error.code === 15) return { kind: 'unavailable' };
    if (error.cause !== undefined || [0, 502, 503, 504].includes(error.status ?? 0)) return { kind: 'unavailable' };
  }
  return { kind: 'error' };
}
