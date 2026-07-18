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
  ObjectStoreResourceContractError,
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

const wireObjectStoreSchema = z.object({
  type: z.enum(['DATABASE', 'FILE', 'OBS']),
  // Older DATABASE and FILE records may omit config or store it as null.
  // Normalize that wire-only variation here so the domain always sees an object.
  config: wireConfigSchema.nullish().transform(config => config ?? {})
}).nullable();

export function parseObjectStoreReadModel(value: unknown): ObjectStoreReadModel | null {
  const result = wireObjectStoreSchema.safeParse(value);
  if (!result.success) throw new ObjectStoreResourceContractError();
  if (result.data === null) return null;

  const { secretKey } = result.data.config;
  const visible = copyVisibleConfig(result.data.config);
  const config: ObjectStoreReadConfig = result.data.type === 'OBS'
    ? { ...visible, secretConfigured: Boolean(secretKey?.trim()) }
    : visible;
  return { type: result.data.type, config };
}

function copyVisibleConfig(config: z.infer<typeof wireConfigSchema>): ObjectStoreReadConfig {
  const visible: ObjectStoreReadConfig = {};
  if (config.accessKey !== undefined) visible.accessKey = config.accessKey;
  if (config.bucketName !== undefined) visible.bucketName = config.bucketName;
  if (config.endpoint !== undefined) visible.endpoint = config.endpoint;
  if (config.savePath !== undefined) visible.savePath = config.savePath;
  return visible;
}
