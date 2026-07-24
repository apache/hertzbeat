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
import {
  capability,
  component,
  explicitHttps,
  guideBlock,
  key,
  profileError,
  service,
  signalValues,
  text,
  timestamp
} from './instrumentation-v2-schema-parts';
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
    httpsEndpoints: z.object({ http_protobuf: explicitHttps.optional(), grpc: explicitHttps.optional() }).strict(),
    authHeaderName: text.optional(),
    collectorId: text.optional(),
    errorCode: profileError.optional()
  })
  .strict()
  .superRefine(validateIntakeProfile);

type IntakeProfile = z.infer<typeof intakeProfile>;

function hasValidCollectorIdentity(value: IntakeProfile) {
  return value.kind === 'hertzbeat_collector' ? Boolean(value.collectorId) : value.collectorId === undefined;
}

function validateIntakeProfile(value: IntakeProfile, context: z.RefinementCtx) {
  if (value.availability === 'available' && !hasValidAvailableConnectivity(value)) {
    context.addIssue({ code: 'custom', message: 'available profile connectivity is invalid' });
  }
  if (value.availability === 'unavailable' && hasAdvertisedConnectivity(value)) {
    context.addIssue({ code: 'custom', message: 'unavailable profile advertised connectivity' });
  }
}

function hasValidAvailableConnectivity(value: IntakeProfile) {
  const endpointCount = Object.values(value.httpsEndpoints).length;
  const expectedGateway = {
    server: 'server',
    hertzbeat_collector: 'collector',
    external_otel_collector: 'external'
  }[value.kind];
  const transportsMatch = value.supportedTransports.every(transport => Boolean(value.httpsEndpoints[transport]));
  return (
    Boolean(value.gateway) &&
    value.supportedTransports.length > 0 &&
    value.supportedTransports.length === endpointCount &&
    transportsMatch &&
    value.authHeaderName === 'Authorization' &&
    !value.errorCode &&
    value.gateway === expectedGateway &&
    hasValidCollectorIdentity(value)
  );
}

function hasAdvertisedConnectivity(value: IntakeProfile) {
  return Boolean(
    value.gateway ||
    value.supportedTransports.length ||
    Object.values(value.httpsEndpoints).length ||
    value.authHeaderName ||
    !value.errorCode ||
    !hasValidCollectorIdentity(value)
  );
}

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
  .superRefine(validateIntakeProfiles);

type IntakeProfiles = z.infer<typeof intakeProfilesSchema>;

function validateIntakeProfiles(value: IntakeProfiles, context: z.RefinementCtx) {
  if (value.status === 'available' && value.profiles.length === 0) {
    context.addIssue({ code: 'custom', message: 'available discovery requires profiles' });
  }
  if (value.status === 'unconfigured' && (value.profiles.length || value.errorCode || value.defaultProfileId)) {
    context.addIssue({ code: 'custom', message: 'unconfigured discovery must be empty' });
  }
  if (value.status === 'unavailable' && !isValidUnavailableDiscovery(value)) {
    context.addIssue({ code: 'custom', message: 'unavailable discovery is invalid' });
  }
  if (value.defaultProfileId && !hasAvailableDefaultProfile(value)) {
    context.addIssue({ code: 'custom', message: 'default profile is invalid' });
  }
}

function isValidUnavailableDiscovery(value: IntakeProfiles) {
  return (
    value.errorCode === 'intake_profile_discovery_unavailable' && value.profiles.length === 0 && !value.defaultProfileId
  );
}

function hasAvailableDefaultProfile(value: IntakeProfiles) {
  return value.profiles.some(profile => profile.id === value.defaultProfileId && profile.availability === 'available');
}

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
  .strict()
  .superRefine(validateSignalDetection);

type SignalDetection = z.infer<typeof signalDetection>;

function validateSignalDetection(value: SignalDetection, context: z.RefinementCtx) {
  const valid = {
    received: Boolean(value.lastReceivedAt) && !value.errorCode,
    waiting: !value.lastReceivedAt && value.errorCode === 'signal_not_received',
    unsupported: !value.lastReceivedAt && value.errorCode === 'signal_not_supported',
    unavailable: !value.lastReceivedAt && Boolean(value.errorCode),
    error: Boolean(value.errorCode)
  }[value.status];
  if (!valid) context.addIssue({ code: 'custom', message: `${value.status} signal evidence is invalid` });
}

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
    validateQueryJumps(value, context);
  });

type Detection = z.infer<typeof detectionSchema>;

function validateQueryJumps(value: Detection, context: z.RefinementCtx) {
  for (const jump of value.queryJumps) {
    const signal = value.signals[jump.signal];
    if (JSON.stringify(jump.context) !== JSON.stringify(value.queryJumpContext)) {
      context.addIssue({ code: 'custom', message: 'query jump context must match shared context' });
    }
    if (jump.enabled !== (signal.status === 'received')) {
      context.addIssue({ code: 'custom', message: 'query jump enabled state must match received signal' });
    }
  }
}

export const messageEnvelopeSchema = z
  .object({ code: z.number().int(), msg: z.string().nullable().optional(), data: z.unknown() })
  .strict();
