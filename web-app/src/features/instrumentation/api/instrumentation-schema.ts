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
  INSTRUMENTATION_CAPABILITIES,
  INSTRUMENTATION_DETECTION_ERROR_CODES,
  INSTRUMENTATION_DETECTION_STATUSES,
  INSTRUMENTATION_ENVIRONMENTS,
  INSTRUMENTATION_FRAMEWORKS,
  INSTRUMENTATION_LANGUAGES,
  INSTRUMENTATION_METHODS,
  INSTRUMENTATION_PLATFORMS,
  INSTRUMENTATION_POLLING_DECISIONS,
  INSTRUMENTATION_SCHEMA_VERSION,
  INSTRUMENTATION_SIGNALS,
  INSTRUMENTATION_STEP_TYPES,
  INSTRUMENTATION_VERSION_POLICIES
} from '../model/instrumentation-contract';

const textSchema = z.string().min(1);
const positiveIntegerSchema = z.number().int().positive();
const optionalNullableIntegerSchema = positiveIntegerSchema.nullish().transform(value => value ?? null);
const optionalNullableErrorSchema = z
  .enum(INSTRUMENTATION_DETECTION_ERROR_CODES)
  .nullish()
  .transform(value => value ?? null);

export const instrumentationMessageEnvelopeSchema = z
  .object({
    code: z.number().int(),
    msg: z.string().nullable().optional(),
    data: z.unknown()
  })
  .strict();
export type InstrumentationMessageEnvelope = z.output<typeof instrumentationMessageEnvelopeSchema>;

const instrumentationSelectionSchema = z.object({
  language: z.enum(INSTRUMENTATION_LANGUAGES),
  framework: z.enum(INSTRUMENTATION_FRAMEWORKS),
  method: z.enum(INSTRUMENTATION_METHODS),
  environment: z.enum(INSTRUMENTATION_ENVIRONMENTS),
  platform: z.enum(INSTRUMENTATION_PLATFORMS)
});

const serviceIdentitySchema = z.object({
  name: textSchema,
  namespace: textSchema,
  environment: textSchema,
  serviceInstanceId: textSchema.optional(),
  endpoint: textSchema.optional()
});

const capabilityValuesSchema = signalValues(z.enum(INSTRUMENTATION_CAPABILITIES));

const dependencySchema = z
  .object({
    name: textSchema,
    sourceUrl: textSchema,
    version: textSchema,
    license: textSchema,
    purposeKey: textSchema,
    official: z.boolean(),
    bundledWithHertzBeat: z.boolean()
  })
  .superRefine(requireOfficialExternalPackage);

const artifactSchema = z.object({
  name: textSchema,
  downloadUrl: textSchema,
  algorithm: textSchema,
  digest: textSchema,
  provenanceUrl: textSchema
});

const componentSchema = z
  .object({
    name: textSchema,
    sourceUrl: textSchema,
    version: textSchema.nullable(),
    versionPolicy: z.enum(INSTRUMENTATION_VERSION_POLICIES),
    license: textSchema,
    installationLocationKey: textSchema,
    official: z.boolean(),
    bundledWithHertzBeat: z.boolean(),
    dependencies: z.array(dependencySchema),
    artifacts: z.array(artifactSchema)
  })
  .superRefine(requireOfficialExternalPackage);

const methodOptionSchema = z.object({
  method: z.enum(INSTRUMENTATION_METHODS),
  labelKey: textSchema,
  preview: z.boolean(),
  environments: z.array(z.enum(INSTRUMENTATION_ENVIRONMENTS)),
  platforms: z.array(z.enum(INSTRUMENTATION_PLATFORMS)),
  signals: capabilityValuesSchema,
  component: componentSchema
});

export const catalogResponseSchema = z.object({
  schemaVersion: z.literal(INSTRUMENTATION_SCHEMA_VERSION),
  languages: z.array(
    z.object({
      language: z.enum(INSTRUMENTATION_LANGUAGES),
      labelKey: textSchema,
      frameworks: z.array(
        z.object({
          framework: z.enum(INSTRUMENTATION_FRAMEWORKS),
          labelKey: textSchema,
          methods: z.array(methodOptionSchema)
        })
      )
    })
  )
});

const secretPlaceholderSchema = z.object({
  marker: textSchema,
  valueFormat: z.literal('url_unreserved'),
  replacement: z.literal('raw')
});

const guideSnippetSchema = z.object({
  id: textSchema,
  language: textSchema,
  content: textSchema,
  secretPlaceholders: z.array(textSchema)
});

export const guideRenderResponseSchema = z.object({
  schemaVersion: z.literal(INSTRUMENTATION_SCHEMA_VERSION),
  selection: instrumentationSelectionSchema,
  signals: capabilityValuesSchema,
  component: componentSchema,
  secretPlaceholders: z.record(z.string(), secretPlaceholderSchema),
  steps: z.array(
    z.object({
      id: textSchema,
      type: z.enum(INSTRUMENTATION_STEP_TYPES),
      titleKey: textSchema,
      executionLocationKey: textSchema,
      snippets: z.array(guideSnippetSchema)
    })
  )
});

export const signalDetectionSchema = z.object({
  status: z.enum(INSTRUMENTATION_DETECTION_STATUSES),
  lastReceivedAt: optionalNullableIntegerSchema,
  errorCode: optionalNullableErrorSchema
});

const queryJumpContextSchema = z.object({
  serviceName: textSchema,
  serviceNamespace: textSchema,
  environment: textSchema,
  collectorId: textSchema,
  serviceInstanceId: textSchema.optional(),
  endpoint: textSchema.optional(),
  startedAt: positiveIntegerSchema,
  detectedAt: positiveIntegerSchema
});

export const detectionResponseSchema = z.object({
  schemaVersion: z.literal(INSTRUMENTATION_SCHEMA_VERSION),
  detectedAt: positiveIntegerSchema,
  context: instrumentationSelectionSchema.extend({
    service: serviceIdentitySchema,
    collectorId: textSchema,
    startedAt: positiveIntegerSchema
  }),
  signals: signalValues(signalDetectionSchema),
  polling: z.object({
    decision: z.enum(INSTRUMENTATION_POLLING_DECISIONS),
    pollAfterMs: optionalNullableIntegerSchema,
    deadlineAt: positiveIntegerSchema
  }),
  queryJumpContext: queryJumpContextSchema,
  queryJumps: z.array(
    z.object({
      signal: z.enum(INSTRUMENTATION_SIGNALS),
      enabled: z.boolean(),
      context: queryJumpContextSchema
    })
  )
});

export class InstrumentationContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InstrumentationContractError';
  }
}

export function parseInstrumentationSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new InstrumentationContractError(`${label} did not match instrumentation schema v1`, {
    cause: result.error
  });
}

export function contractViolation(message: string): never {
  throw new InstrumentationContractError(message);
}

function signalValues<T extends z.ZodType>(schema: T) {
  return z.object({ metrics: schema, logs: schema, traces: schema });
}

function requireOfficialExternalPackage(
  value: { official: boolean; bundledWithHertzBeat: boolean },
  context: z.RefinementCtx
) {
  if (!value.official || value.bundledWithHertzBeat) {
    context.addIssue({ code: 'custom', message: 'instrumentation packages must be official and external' });
  }
}
