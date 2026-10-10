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
  validateObjectStoreDraft,
  type ObjectStoreDraft,
  type ObjectStoreDraftConfig,
  type ObjectStoreSecretName,
  type ObjectStoreType
} from '../model/object-store-model';
import { objectStoreApiRequest } from './object-store-api-failure';
import { parseObjectStoreMutationResult, parseObjectStoreReadModel } from './object-store-schema';

export { parseObjectStoreDraft } from './object-store-schema';

export type ObjectStorePayload = {
  type: ObjectStoreType;
  config: ObjectStoreDraftConfig;
  clearSecrets: ObjectStoreSecretName[];
};

export const objectStoreEndpoint = '/api/config/oss';

export async function loadObjectStore() {
  return objectStoreApiRequest('read', async () => {
    const response = await apiMessageGet(objectStoreEndpoint);
    return parseObjectStoreReadModel(response);
  });
}

export async function saveObjectStore(config: ObjectStoreDraft) {
  return objectStoreApiRequest('write', async () => {
    const payload = buildObjectStorePayload(config);
    return parseObjectStoreMutationResult(await apiMessagePost(objectStoreEndpoint, payload));
  });
}

export function buildObjectStorePayload(config: ObjectStoreDraft): ObjectStorePayload {
  if (config.type !== 'OBS') return { type: config.type, config: {}, clearSecrets: [] };
  if (validateObjectStoreDraft(config).length > 0) throw new ObjectStoreDraftContractError();
  const normalized = normalizeObjectStoreDraft(config);
  const obsConfig: ObjectStoreDraftConfig = {
    bucketName: String(normalized.config.bucketName),
    endpoint: String(normalized.config.endpoint),
    savePath: String(normalized.config.savePath)
  };
  if (normalized.config.accessKey) obsConfig.accessKey = normalized.config.accessKey;
  if (normalized.config.secretKey) obsConfig.secretKey = normalized.config.secretKey;
  return {
    type: 'OBS',
    config: obsConfig,
    // Clearing either credential would leave an active OBS configuration
    // invalid, so the editor supports preserve-or-replace only.
    clearSecrets: []
  };
}
