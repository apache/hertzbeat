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
