/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { managedRuntimeSafeNamePattern } from '../model/collector-runtime-config-model';
import { managedPrometheusLimits, type ManagedPrometheusTargetDraft } from '../model/collector-prometheus-source-model';
import type { ManagedOtelRuntimeConfig } from './collector-runtime-config-schema';
import { managedRuntimeDurationSeconds } from './collector-runtime-duration';
import { replaceManagedOtelPrometheusTargets } from './collector-runtime-source-update';

const headerReferenceDraftSchema = z.object({ headerName: z.string(), secretReferenceName: z.string() }).strict();
const prometheusTargetDraftSchema = z
  .object({
    name: z.string().regex(managedRuntimeSafeNamePattern),
    endpoint: z.string(),
    intervalSeconds: z
      .number()
      .int()
      .min(managedPrometheusLimits.intervalSeconds.minimum)
      .max(managedPrometheusLimits.intervalSeconds.maximum),
    timeoutSeconds: z
      .number()
      .int()
      .min(managedPrometheusLimits.timeoutSeconds.minimum)
      .max(managedPrometheusLimits.timeoutSeconds.maximum),
    headerSecretRefs: z.array(headerReferenceDraftSchema).max(managedPrometheusLimits.headerReferences),
    tlsCaProfile: z.string()
  })
  .strict()
  .refine(target => uniqueCaseInsensitive(target.headerSecretRefs.map(reference => reference.headerName)));
const prometheusTargetDraftsSchema = z.array(prometheusTargetDraftSchema).max(managedPrometheusLimits.targets);

export function buildManagedOtelPrometheusTargetsUpdate(
  current: ManagedOtelRuntimeConfig | null,
  value: unknown
): ManagedOtelRuntimeConfig | null {
  const drafts = prometheusTargetDraftsSchema.safeParse(value);
  if (!drafts.success) return null;
  return replaceManagedOtelPrometheusTargets(
    current,
    drafts.data.map(target => ({
      name: target.name,
      endpoint: target.endpoint,
      interval: `PT${target.intervalSeconds}S`,
      timeout: `PT${target.timeoutSeconds}S`,
      headerSecretRefs: Object.fromEntries(
        target.headerSecretRefs.map(reference => [reference.headerName, reference.secretReferenceName])
      ),
      tlsCaProfile: target.tlsCaProfile
    }))
  );
}

export function managedOtelPrometheusTargetDraft(
  target: ManagedOtelRuntimeConfig['prometheusTargets'][number]
): ManagedPrometheusTargetDraft {
  return {
    name: target.name,
    endpoint: target.endpoint,
    intervalSeconds: managedRuntimeDurationSeconds(target.interval),
    timeoutSeconds: managedRuntimeDurationSeconds(target.timeout),
    headerSecretRefs: Object.entries(target.headerSecretRefs).map(([headerName, secretReferenceName]) => ({
      headerName,
      secretReferenceName
    })),
    tlsCaProfile: target.tlsCaProfile
  };
}

function uniqueCaseInsensitive(values: string[]) {
  return new Set(values.map(value => value.toLowerCase())).size === values.length;
}
