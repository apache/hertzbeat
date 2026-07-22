/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
