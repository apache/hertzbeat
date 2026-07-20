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

import {
  ObjectStoreDraftContractError,
  ObjectStoreResourceContractError,
  objectStoreObsFieldNames,
  type ObjectStoreDraft,
  type ObjectStoreReadConfig,
  type ObjectStoreReadModel
} from '../model/object-store-model';

const wireConfigSchema = z.object({
  accessKey: z.string().optional(),
  secretKey: z.string().optional(),
  bucketName: z.string().optional(),
  endpoint: z.string().optional(),
  savePath: z.string().optional()
});

const wireObjectStoreSchema = z
  .object({
    type: z.enum(['DATABASE', 'FILE', 'OBS']),
    // Older DATABASE and FILE records may omit config or store it as null.
    // Normalize that wire-only variation here so the domain always sees an object.
    config: wireConfigSchema.nullish().transform(config => config ?? {})
  })
  .nullable();
const draftConfigSchema = z.partialRecord(z.enum(objectStoreObsFieldNames), z.string());
const objectStoreDraftSchema = z
  .object({
    type: z.enum(['DATABASE', 'FILE', 'OBS']),
    config: draftConfigSchema
  })
  .strict();
const mutationResultSchema = z.string();

/** Parses untrusted Refine mutation variables before they enter the write API. */
export function parseObjectStoreDraft(value: unknown): ObjectStoreDraft {
  const result = objectStoreDraftSchema.safeParse(value);
  if (!result.success) throw new ObjectStoreDraftContractError();
  return { type: result.data.type, config: copyDraftConfig(result.data.config) };
}

export function parseObjectStoreReadModel(value: unknown): ObjectStoreReadModel | null {
  const result = wireObjectStoreSchema.safeParse(value);
  if (!result.success) throw new ObjectStoreResourceContractError();
  if (result.data === null) return null;

  const { secretKey } = result.data.config;
  const visible = copyVisibleConfig(result.data.config);
  const config: ObjectStoreReadConfig =
    result.data.type === 'OBS' ? { ...visible, secretConfigured: Boolean(secretKey?.trim()) } : visible;
  return { type: result.data.type, config };
}

export function parseObjectStoreMutationResult(value: unknown): string {
  const result = mutationResultSchema.safeParse(value);
  if (!result.success) throw new ObjectStoreResourceContractError();
  return result.data;
}

function copyVisibleConfig(config: z.infer<typeof wireConfigSchema>): ObjectStoreReadConfig {
  const visible: ObjectStoreReadConfig = {};
  if (config.accessKey !== undefined) visible.accessKey = config.accessKey;
  if (config.bucketName !== undefined) visible.bucketName = config.bucketName;
  if (config.endpoint !== undefined) visible.endpoint = config.endpoint;
  if (config.savePath !== undefined) visible.savePath = config.savePath;
  return visible;
}

function copyDraftConfig(config: z.infer<typeof wireConfigSchema>): ObjectStoreDraft['config'] {
  const draft: ObjectStoreDraft['config'] = {};
  if (config.accessKey !== undefined) draft.accessKey = config.accessKey;
  if (config.secretKey !== undefined) draft.secretKey = config.secretKey;
  if (config.bucketName !== undefined) draft.bucketName = config.bucketName;
  if (config.endpoint !== undefined) draft.endpoint = config.endpoint;
  if (config.savePath !== undefined) draft.savePath = config.savePath;
  return draft;
}
