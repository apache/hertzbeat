/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import {
  BLOCK_TYPES,
  DETECTION_STATUSES,
  POLLING_DECISIONS,
  SIGNALS,
  SOURCE_KINDS
} from '../model/instrumentation-v2-contract';

const text = z.string().min(1);
const key = z.string().regex(/^[a-z0-9_.]{1,160}$/);
const timestamp = z.number().int().positive();
const capability = z.enum(['supported', 'preview', 'unsupported']);
const signalValues = <T extends z.ZodType>(value: T) =>
  z.object({ metrics: value, logs: value, traces: value }).strict();
const service = z
  .object({
    name: text,
    namespace: text,
    environment: text,
    serviceInstanceId: text.optional(),
    endpoint: text.optional()
  })
  .strict();
const component = z
  .object({
    name: text,
    sourceUrl: z.string().url(),
    version: text.nullable(),
    versionPolicy: z.enum(['pinned', 'language_specific']),
    license: text,
    installationLocationKey: key,
    official: z.literal(true),
    bundledWithHertzBeat: z.literal(false),
    dependencies: z.array(
      z.object({
        name: text,
        sourceUrl: z.string().url(),
        version: text,
        license: text,
        purposeKey: key,
        official: z.literal(true),
        bundledWithHertzBeat: z.literal(false)
      })
    ),
    artifacts: z.array(
      z.object({
        name: text,
        downloadUrl: z.string().url(),
        algorithm: text,
        digest: text,
        provenanceUrl: z.string().url()
      })
    )
  })
  .strict();
const selection = {
  sourceKind: z.enum(SOURCE_KINDS),
  recipeId: text.optional(),
  language: text.optional(),
  framework: text.optional(),
  method: text.optional(),
  environment: text.optional(),
  platform: text.optional()
};
const intakeProfile = z
  .object({
    id: text,
    kind: z.enum(['server', 'hertzbeat_collector', 'external_otel_collector']),
    availability: z.enum(['available', 'unavailable']),
    gateway: z.enum(['server', 'collector', 'external']).optional(),
    supportedTransports: z.array(z.enum(['http_protobuf', 'grpc'])),
    httpsEndpoints: z
      .object({ http_protobuf: z.string().url().optional(), grpc: z.string().url().optional() })
      .strict(),
    authHeaderName: text.optional(),
    collectorId: text.optional(),
    errorCode: text.optional()
  })
  .strict()
  .superRefine((value, context) => {
    const endpointCount = Object.values(value.httpsEndpoints).length;
    if (
      value.availability === 'available' &&
      (!value.gateway ||
        value.supportedTransports.length === 0 ||
        value.supportedTransports.length !== endpointCount ||
        value.authHeaderName !== 'Authorization' ||
        value.errorCode)
    ) {
      context.addIssue({ code: 'custom', message: 'available profile connectivity is invalid' });
    }
    if (
      value.availability === 'unavailable' &&
      (value.gateway || value.supportedTransports.length || endpointCount || value.authHeaderName || !value.errorCode)
    ) {
      context.addIssue({ code: 'custom', message: 'unavailable profile advertised connectivity' });
    }
  });

export const catalogSchema = z
  .object({
    schemaVersion: z.literal(2),
    sources: z.array(z.object({ kind: z.enum(SOURCE_KINDS), labelKey: key, descriptionKey: key }).strict()),
    recipes: z.array(
      z
        .object({
          id: text,
          kind: z.enum(SOURCE_KINDS),
          labelKey: key,
          preview: z.boolean(),
          language: text.optional(),
          framework: text.optional(),
          method: text.optional(),
          environments: z.array(text),
          platforms: z.array(text),
          signals: signalValues(capability),
          components: z.array(component),
          blocksPreview: z.array(z.enum(BLOCK_TYPES))
        })
        .strict()
    )
  })
  .strict()
  .superRefine((value, context) => {
    const order = value.sources.map(source => source.kind).join(',');
    if (order !== 'quick_start,application,existing_opentelemetry') {
      context.addIssue({ code: 'custom', message: 'source order is invalid' });
    }
    if (new Set(value.recipes.map(recipe => recipe.id)).size !== value.recipes.length) {
      context.addIssue({ code: 'custom', message: 'recipe IDs must be unique' });
    }
  });

export const intakeProfilesSchema = z
  .object({
    schemaVersion: z.literal(2),
    status: z.enum(['available', 'unconfigured', 'unavailable']),
    errorCode: z.literal('intake_profile_discovery_unavailable').optional(),
    defaultProfileId: text.optional(),
    profiles: z.array(intakeProfile)
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === 'available' && value.profiles.length === 0) {
      context.addIssue({ code: 'custom', message: 'available discovery requires profiles' });
    }
    if (value.status === 'unconfigured' && (value.profiles.length || value.errorCode || value.defaultProfileId)) {
      context.addIssue({ code: 'custom', message: 'unconfigured discovery must be empty' });
    }
    if (
      value.status === 'unavailable' &&
      (value.errorCode !== 'intake_profile_discovery_unavailable' || value.profiles.length || value.defaultProfileId)
    ) {
      context.addIssue({ code: 'custom', message: 'unavailable discovery is invalid' });
    }
    if (
      value.defaultProfileId &&
      !value.profiles.some(profile => profile.id === value.defaultProfileId && profile.availability === 'available')
    ) {
      context.addIssue({ code: 'custom', message: 'default profile is invalid' });
    }
  });

const guideBlock = z
  .object({
    id: text,
    type: z.enum(BLOCK_TYPES),
    titleKey: key,
    bodyKey: key.optional(),
    executionLocationKey: key,
    language: text.optional(),
    content: text.optional(),
    href: z.string().url().optional(),
    placeholders: z.array(z.literal('authorizationToken'))
  })
  .strict()
  .superRefine((value, context) => {
    const copyable = ['command', 'code', 'environment', 'download'].includes(value.type);
    if (copyable !== Boolean(value.content) || (copyable && value.bodyKey) || (!copyable && value.content)) {
      context.addIssue({ code: 'custom', message: 'guide block content does not match type' });
    }
    if (['note', 'warning', 'check'].includes(value.type) && !value.bodyKey) {
      context.addIssue({ code: 'custom', message: 'explanatory block requires body key' });
    }
    if (value.type === 'link' && !value.href) {
      context.addIssue({ code: 'custom', message: 'link block requires href' });
    }
    if (value.placeholders.includes('authorizationToken') && !value.content?.includes('${HERTZBEAT_TOKEN}')) {
      context.addIssue({ code: 'custom', message: 'secret marker is missing' });
    }
  });

export const renderSchema = z
  .object({
    schemaVersion: z.literal(2),
    sourceKind: z.enum(SOURCE_KINDS),
    recipeId: text,
    intakeProfile,
    service,
    signals: signalValues(capability),
    components: z.array(component),
    secretPlaceholders: z
      .object({
        authorizationToken: z
          .object({ marker: z.literal('${HERTZBEAT_TOKEN}'), kind: z.literal('authorization_token') })
          .strict()
      })
      .strict(),
    blocks: z.array(guideBlock)
  })
  .strict();

const jumpContext = z
  .object({
    serviceName: text,
    serviceNamespace: text.optional(),
    environment: text.optional(),
    intakeProfileId: text,
    collectorId: text.optional(),
    serviceInstanceId: text.optional(),
    endpoint: text.optional(),
    startedAt: timestamp,
    detectedAt: timestamp
  })
  .strict();
const signalDetection = z
  .object({ status: z.enum(DETECTION_STATUSES), lastReceivedAt: timestamp.optional(), errorCode: text.optional() })
  .strict();

export const detectionSchema = z
  .object({
    schemaVersion: z.literal(2),
    detectedAt: timestamp,
    context: z
      .object({
        ...selection,
        service,
        intakeProfileId: text,
        collectorId: text.optional(),
        startedAt: timestamp,
        windowEndAt: timestamp
      })
      .strict(),
    signals: signalValues(signalDetection),
    polling: z
      .object({ decision: z.enum(POLLING_DECISIONS), pollAfterMs: timestamp.optional(), deadlineAt: timestamp })
      .strict(),
    queryJumpContext: jumpContext,
    queryJumps: z.array(z.object({ signal: z.enum(SIGNALS), enabled: z.boolean(), context: jumpContext }).strict())
  })
  .strict()
  .superRefine((value, context) => {
    if (value.queryJumps.length !== 3 || new Set(value.queryJumps.map(jump => jump.signal)).size !== 3) {
      context.addIssue({ code: 'custom', message: 'exactly three signal jumps are required' });
    }
    if ((value.polling.decision === 'continue_polling') !== Boolean(value.polling.pollAfterMs)) {
      context.addIssue({ code: 'custom', message: 'polling delay does not match decision' });
    }
  });

export const messageEnvelopeSchema = z
  .object({ code: z.number().int(), msg: z.string().nullable().optional(), data: z.unknown() })
  .strict();
