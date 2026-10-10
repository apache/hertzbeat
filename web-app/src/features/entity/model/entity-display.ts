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

import { entityStatuses, entityTypes } from './entity-editor-contract';

const entityDisplayCodes = {
  type: entityTypes,
  status: entityStatuses,
  source: ['manual', 'definition', 'discovery', 'derived', 'otel_resource', 'otel', 'telemetry'],
  direction: ['incoming', 'outgoing', 'related'],
  identityType: ['derived', 'manual', 'otel_resource', 'otel', 'otlp']
} as const;

export type EntityDisplayKind = keyof typeof entityDisplayCodes;

export function localizeEntityCode(t: (key: string) => string, kind: EntityDisplayKind, value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return '—';
  const knownCodes: readonly string[] = entityDisplayCodes[kind];
  return knownCodes.includes(normalized) ? t(`entity.values.${kind}.${normalized}`) : normalized;
}
