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

import { hasOwnProperties } from '@/shared/validation/own-properties';

import {
  ObjectStoreDraftContractError,
  ObjectStoreResourceContractError,
  objectStoreObsFieldNames,
  objectStoreSecretNames,
  type ObjectStoreDraft,
  type ObjectStoreReadModel
} from '../model/object-store-model';

const secretNameSchema = z.enum(objectStoreSecretNames);
const configuredSecretsSchema = z.array(secretNameSchema).refine(items => new Set(items).size === items.length);
const publicObsConfigSchema = z
  .object({
    bucketName: z.string(),
    endpoint: z.string(),
    savePath: z.string()
  })
  .strict();
const wireObjectStoreValueSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('OBS'),
      config: publicObsConfigSchema,
      configuredSecrets: configuredSecretsSchema
    })
    .strict(),
  z
    .object({
      type: z.enum(['DATABASE', 'FILE']),
      config: z.null(),
      configuredSecrets: z.array(z.never()).length(0)
    })
    .strict()
]);
const wireObjectStoreSchema = wireObjectStoreValueSchema.nullable();
const draftConfigSchema = z.partialRecord(z.enum(objectStoreObsFieldNames), z.string());
const objectStoreDraftSchema = z
  .object({
    type: z.enum(['DATABASE', 'FILE', 'OBS']),
    config: draftConfigSchema,
    configuredSecrets: configuredSecretsSchema
  })
  .strict();

/** Parses untrusted Refine mutation variables before they enter the write API. */
export function parseObjectStoreDraft(value: unknown): ObjectStoreDraft {
  if (!hasOwnProperties(value, ['type', 'config'])) throw new ObjectStoreDraftContractError();
  const result = objectStoreDraftSchema.safeParse(value);
  if (!result.success) throw new ObjectStoreDraftContractError();
  return {
    type: result.data.type,
    config: copyDraftConfig(result.data.config),
    configuredSecrets: [...result.data.configuredSecrets]
  };
}

export function parseObjectStoreReadModel(value: unknown): ObjectStoreReadModel | null {
  const result = wireObjectStoreSchema.safeParse(value);
  if (!result.success) throw new ObjectStoreResourceContractError();
  if (result.data === null) return null;

  return copyReadModel(result.data);
}

export function parseObjectStoreMutationResult(value: unknown): ObjectStoreReadModel {
  const result = wireObjectStoreValueSchema.safeParse(value);
  if (!result.success) throw new ObjectStoreResourceContractError();
  return copyReadModel(result.data);
}

function copyReadModel(value: z.infer<typeof wireObjectStoreValueSchema>): ObjectStoreReadModel {
  return {
    type: value.type,
    config:
      value.type === 'OBS'
        ? {
            bucketName: value.config.bucketName,
            endpoint: value.config.endpoint,
            savePath: value.config.savePath
          }
        : {},
    configuredSecrets: [...value.configuredSecrets]
  };
}

function copyDraftConfig(config: z.infer<typeof draftConfigSchema>): ObjectStoreDraft['config'] {
  const draft: ObjectStoreDraft['config'] = {};
  if (config.accessKey !== undefined) draft.accessKey = config.accessKey;
  if (config.secretKey !== undefined) draft.secretKey = config.secretKey;
  if (config.bucketName !== undefined) draft.bucketName = config.bucketName;
  if (config.endpoint !== undefined) draft.endpoint = config.endpoint;
  if (config.savePath !== undefined) draft.savePath = config.savePath;
  return draft;
}
