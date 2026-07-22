/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import {
  managedRuntimeFilterPresets,
  managedRuntimeHostScrapers,
  managedRuntimeResourceDetectors
} from '../model/collector-runtime-config-model';

const sourceNameSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u);
const isoDurationSchema = z.string().regex(/^PT(?:(?:\d+)M)?(?:(?:\d+)S)?$/u);
const resourceDetectorsSchema = uniqueEnumArray(managedRuntimeResourceDetectors);
const filterPresetsSchema = uniqueEnumArray(managedRuntimeFilterPresets);
const hostScrapersSchema = uniqueEnumArray(managedRuntimeHostScrapers);
const reservedHeaders = new Set([
  'authorization',
  'host',
  'content-encoding',
  'content-length',
  'content-type',
  'user-agent',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'www-authenticate',
  'accept-encoding',
  'x-prometheus-remote-write-version',
  'x-prometheus-remote-read-version',
  'x-prometheus-scrape-timeout-seconds',
  'x-amz-date',
  'x-amz-security-token',
  'x-amz-content-sha256'
]);
const headerNamePattern = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;

const boundedHostDurationSchema = isoDurationSchema.refine(value => durationInRange(value, 10, 300));
const timeoutDurationSchema = isoDurationSchema.refine(value => durationInRange(value, 1, 60));
const headerSecretRefsSchema = z
  .record(z.string(), sourceNameSchema)
  .refine(headers => Object.keys(headers).length <= 8)
  .refine(headers => Object.keys(headers).every(header => safeHeaderName(header)))
  .refine(headers => uniqueCaseInsensitive(Object.keys(headers)));

const prometheusTargetSchema = z
  .object({
    name: sourceNameSchema,
    endpoint: z.string().refine(safePrometheusUri),
    interval: boundedHostDurationSchema,
    timeout: timeoutDurationSchema,
    headerSecretRefs: headerSecretRefsSchema,
    tlsCaProfile: z.union([z.literal(''), sourceNameSchema])
  })
  .strict()
  .superRefine((target, context) => {
    if (durationSeconds(target.timeout) > durationSeconds(target.interval)) {
      context.addIssue({ code: 'custom', message: 'Prometheus timeout must not exceed its interval' });
    }
  });

const fileLogSourceSchema = z.object({ name: sourceNameSchema, pathProfile: sourceNameSchema }).strict();

const managedOtelRuntimeConfigSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    revision: z.number().int().positive().safe(),
    hostMetricsEnabled: z.boolean(),
    hostMetricsInterval: boundedHostDurationSchema,
    prometheusTargets: uniqueNamedArray(prometheusTargetSchema, 32),
    fileLogSources: uniqueNamedArray(fileLogSourceSchema, 16),
    environment: z.union([z.literal(''), sourceNameSchema]),
    resourceDetectors: resourceDetectorsSchema,
    telemetryFilterPresets: filterPresetsSchema,
    hostMetricsScrapers: hostScrapersSchema
  })
  .strict()
  .superRefine((config, context) => {
    if (config.hostMetricsEnabled && config.hostMetricsScrapers.length === 0) {
      context.addIssue({ code: 'custom', message: 'Enabled host metrics require a scraper' });
    }
    if (config.schemaVersion < 3 && usesAdvancedSourcePolicy(config)) {
      context.addIssue({ code: 'custom', message: 'Advanced source policy requires schema 3' });
    }
    if (config.schemaVersion === 1 && !usesNormalizedLegacyGovernance(config)) {
      context.addIssue({ code: 'custom', message: 'Schema 1 must use normalized governance defaults' });
    }
  });

export type ManagedOtelRuntimeConfig = z.output<typeof managedOtelRuntimeConfigSchema>;

const coreDraftSchema = z
  .object({
    environment: z.union([z.literal(''), sourceNameSchema]),
    hostMetricsEnabled: z.boolean(),
    hostMetricsIntervalSeconds: z.number().int().min(10).max(300),
    hostMetricsScrapers: hostScrapersSchema,
    resourceDetectors: resourceDetectorsSchema,
    telemetryFilterPresets: filterPresetsSchema
  })
  .strict()
  .superRefine((draft, context) => {
    if (draft.hostMetricsEnabled && draft.hostMetricsScrapers.length === 0) {
      context.addIssue({ code: 'custom', message: 'Enabled host metrics require a scraper' });
    }
  });

export function parseManagedOtelRuntimeConfig(value: unknown): ManagedOtelRuntimeConfig | null {
  const result = managedOtelRuntimeConfigSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function buildManagedOtelRuntimeConfigUpdate(
  current: ManagedOtelRuntimeConfig | null,
  value: unknown
): ManagedOtelRuntimeConfig | null {
  if (!current || current.revision >= Number.MAX_SAFE_INTEGER) return null;
  const draft = coreDraftSchema.safeParse(value);
  if (!draft.success) return null;
  return parseManagedOtelRuntimeConfig({
    ...current,
    schemaVersion: 3,
    revision: current.revision + 1,
    hostMetricsEnabled: draft.data.hostMetricsEnabled,
    hostMetricsInterval: `PT${draft.data.hostMetricsIntervalSeconds}S`,
    environment: draft.data.environment,
    resourceDetectors: draft.data.resourceDetectors,
    telemetryFilterPresets: draft.data.telemetryFilterPresets,
    hostMetricsScrapers: draft.data.hostMetricsScrapers
  });
}

export function managedRuntimeDurationSeconds(value: string) {
  return durationSeconds(value);
}

function uniqueEnumArray<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .array(z.enum(values))
    .max(values.length)
    .refine(items => new Set(items).size === items.length);
}

function uniqueNamedArray<T extends z.ZodType<{ name: string }>>(schema: T, maximum: number) {
  return z
    .array(schema)
    .max(maximum)
    .refine(items => new Set(items.map(item => item.name)).size === items.length);
}

function durationSeconds(value: string) {
  const match = /^PT(?:(\d+)M)?(?:(\d+)S)?$/u.exec(value);
  if (!match || (!match[1] && !match[2])) return Number.NaN;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

function durationInRange(value: string, minimum: number, maximum: number) {
  const seconds = durationSeconds(value);
  return Number.isSafeInteger(seconds) && seconds >= minimum && seconds <= maximum;
}

function safePrometheusUri(value: string) {
  if (value !== value.trim() || /\s/u.test(value)) return false;
  try {
    const endpoint = new URL(value);
    return (
      (endpoint.protocol === 'http:' || endpoint.protocol === 'https:') &&
      Boolean(endpoint.hostname) &&
      !endpoint.username &&
      !endpoint.password &&
      !endpoint.search &&
      !endpoint.hash
    );
  } catch {
    return false;
  }
}

function safeHeaderName(header: string) {
  return headerNamePattern.test(header) && !reservedHeaders.has(header.toLowerCase());
}

function uniqueCaseInsensitive(values: string[]) {
  return new Set(values.map(value => value.toLowerCase())).size === values.length;
}

function usesAdvancedSourcePolicy(config: ManagedOtelRuntimeConfig) {
  const defaultScrapers = new Set(managedRuntimeHostScrapers);
  return (
    config.hostMetricsScrapers.length !== defaultScrapers.size ||
    config.hostMetricsScrapers.some(scraper => !defaultScrapers.has(scraper)) ||
    config.prometheusTargets.some(
      target =>
        durationSeconds(target.timeout) !== 10 ||
        Object.keys(target.headerSecretRefs).length > 0 ||
        target.tlsCaProfile !== ''
    )
  );
}

function usesNormalizedLegacyGovernance(config: ManagedOtelRuntimeConfig) {
  return (
    config.environment === '' &&
    config.telemetryFilterPresets.length === 0 &&
    sameEnumSet(config.resourceDetectors, ['ENV', 'SYSTEM'])
  );
}

function sameEnumSet(values: readonly string[], expected: readonly string[]) {
  const actual = new Set(values);
  return actual.size === expected.length && expected.every(value => actual.has(value));
}
