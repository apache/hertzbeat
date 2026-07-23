/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { entityStatuses, entityTypes } from './entity-editor-contract';

const entityDisplayCodes = {
  type: entityTypes,
  status: entityStatuses,
  source: ['manual', 'definition', 'discovery', 'otel_resource', 'otel', 'telemetry'],
  direction: ['incoming', 'outgoing'],
  identityType: ['derived', 'manual', 'otel_resource', 'otel', 'otlp']
} as const;

export type EntityDisplayKind = keyof typeof entityDisplayCodes;

export function localizeEntityCode(t: (key: string) => string, kind: EntityDisplayKind, value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return '—';
  const knownCodes: readonly string[] = entityDisplayCodes[kind];
  return knownCodes.includes(normalized) ? t(`entity.values.${kind}.${normalized}`) : normalized;
}
