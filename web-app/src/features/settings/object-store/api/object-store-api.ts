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

import { apiMessageGet, apiMessagePost } from '@/core/http/api-message';

import {
  normalizeObjectStoreDraft,
  ObjectStoreDraftContractError,
  objectStoreObsFieldNames,
  validateObjectStoreDraft,
  type ObjectStoreDraft,
  type ObjectStoreDraftConfig,
  type ObjectStoreType
} from '../model/object-store-model';
import { parseObjectStoreMutationResult, parseObjectStoreReadModel } from './object-store-schema';

export type ObjectStorePayload = {
  type: ObjectStoreType;
  config: ObjectStoreDraftConfig;
};

export async function loadObjectStore() {
  const response = await apiMessageGet('/api/config/oss');
  return parseObjectStoreReadModel(response);
}

export async function saveObjectStore(config: ObjectStoreDraft) {
  const payload = buildObjectStorePayload(config);
  return parseObjectStoreMutationResult(await apiMessagePost('/api/config/oss', payload));
}

export function buildObjectStorePayload(config: ObjectStoreDraft): ObjectStorePayload {
  if (config.type !== 'OBS') return normalizeObjectStoreDraft(config);
  // The backend replaces the full OBS config and has no keep/clear operation.
  // Reject empty or placeholder secrets instead of overwriting with fake data.
  if (validateObjectStoreDraft(config).length > 0) throw new ObjectStoreDraftContractError();
  const normalized = normalizeObjectStoreDraft(config);
  return {
    type: 'OBS',
    config: Object.fromEntries(objectStoreObsFieldNames.map(field => [field, normalized.config[field]]))
  };
}
