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

import type { AgentEntityInvestigationSource } from './agent-investigation-target';
const keys = new Set(['source', 'entityId', 'start', 'end', 'timezone', 'returnTo']);

export function entityInvestigationTarget(
  entityId: number,
  window: { from: number; to: number; timeZone: string }
): AgentEntityInvestigationSource | undefined {
  if (![entityId, window.from, window.to].every(value => Number.isSafeInteger(value) && value > 0)) return undefined;
  if (window.from >= window.to || window.to - window.from > 24 * 60 * 60_000) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: window.timeZone });
  } catch {
    return undefined;
  }
  if (!window.timeZone.trim()) return undefined;
  return { entityId, signal: { type: 'investigation', start: window.from, end: window.to, timezone: window.timeZone } };
}

export function parseEntityInvestigation(params: URLSearchParams): AgentEntityInvestigationSource | undefined {
  if ([...params.keys()].some(key => !keys.has(key) || params.getAll(key).length !== 1)) return undefined;
  for (const key of ['entityId', 'start', 'end']) if (!/^[1-9]\d*$/u.test(params.get(key) ?? '')) return undefined;
  return entityInvestigationTarget(Number(params.get('entityId')), {
    from: Number(params.get('start')),
    to: Number(params.get('end')),
    timeZone: params.get('timezone') ?? ''
  });
}

export function appendEntityInvestigation(params: URLSearchParams, target: AgentEntityInvestigationSource) {
  params.set('source', 'entityInvestigation');
  params.set('entityId', String(target.entityId));
  params.set('start', String(target.signal.start));
  params.set('end', String(target.signal.end));
  params.set('timezone', target.signal.timezone);
}
