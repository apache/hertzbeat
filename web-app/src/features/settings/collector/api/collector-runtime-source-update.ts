/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { parseManagedOtelRuntimeConfig, type ManagedOtelRuntimeConfig } from './collector-runtime-config-schema';

export function replaceManagedOtelPrometheusTargets(
  current: ManagedOtelRuntimeConfig | null,
  prometheusTargets: unknown
) {
  return replaceRuntimeSources(current, { prometheusTargets });
}

export function replaceManagedOtelFileLogSources(current: ManagedOtelRuntimeConfig | null, fileLogSources: unknown) {
  return replaceRuntimeSources(current, { fileLogSources });
}

function replaceRuntimeSources(current: ManagedOtelRuntimeConfig | null, sources: object) {
  if (!current || current.revision >= Number.MAX_SAFE_INTEGER) return null;
  return parseManagedOtelRuntimeConfig({
    ...current,
    ...sources,
    schemaVersion: 3,
    revision: current.revision + 1
  });
}
