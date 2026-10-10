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

import { managedFileLogLimits, type ManagedFileLogSourceDraft } from '../model/collector-file-log-source-model';
import { managedOtelFileLogSourceSchema } from './collector-file-log-source-contract';
import type { ManagedOtelRuntimeConfig } from './collector-runtime-config-schema';
import { replaceManagedOtelFileLogSources } from './collector-runtime-source-update';

const fileLogSourceDraftsSchema = managedOtelFileLogSourceSchema
  .array()
  .max(managedFileLogLimits.sources)
  .refine(sources => new Set(sources.map(source => source.name)).size === sources.length);

export function buildManagedOtelFileLogSourcesUpdate(
  current: ManagedOtelRuntimeConfig | null,
  value: unknown
): ManagedOtelRuntimeConfig | null {
  const sources = fileLogSourceDraftsSchema.safeParse(value);
  return sources.success ? replaceManagedOtelFileLogSources(current, sources.data) : null;
}

export function managedOtelFileLogSourceDraft(
  source: ManagedOtelRuntimeConfig['fileLogSources'][number]
): ManagedFileLogSourceDraft {
  return { name: source.name, pathProfile: source.pathProfile };
}
