/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { SOURCE_KINDS } from '../model/instrumentation-v2-contract';
export { detectionSchema } from './instrumentation-detection-schema';
import {
  capability,
  component,
  explicitCollectorIntakeEndpoint,
  guideBlock,
  profileError,
  service,
  signalValues,
  text
} from './instrumentation-v2-schema-parts';
export { catalogSchema } from './instrumentation-catalog-schema';
const intakeEndpoint = z
  .object({ url: explicitCollectorIntakeEndpoint, security: z.enum(['tls', 'plaintext']) })
  .strict()
  .superRefine((value, context) => {
    if (!intakeSecurityMatches(value.url, value.security)) {
      context.addIssue({ code: 'custom', message: 'endpoint URL and security evidence are inconsistent' });
    }
  });

function intakeSecurityMatches(value: string, security: 'tls' | 'plaintext') {
  try {
    const protocol = new URL(value).protocol;
    return (protocol === 'https:' && security === 'tls') || (protocol === 'http:' && security === 'plaintext');
  } catch {
    return false;
  }
}
const intakeProfile = z
  .object({
    id: text,
    kind: z.enum(['server', 'hertzbeat_collector', 'external_otel_collector']),
    availability: z.enum(['available', 'unavailable']),
    gateway: z.enum(['server', 'collector', 'external']).optional(),
    supportedTransports: z.array(z.enum(['http_protobuf', 'grpc'])),
    endpoints: z.object({ http_protobuf: intakeEndpoint.optional(), grpc: intakeEndpoint.optional() }).strict(),
    authentication: z.enum(['none', 'bearer_token']).optional(),
    authorizationHeader: z.literal('Authorization').nullable().default(null),
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
  const endpointCount = Object.values(value.endpoints).length;
  const expectedGateway = {
    server: 'server',
    hertzbeat_collector: 'collector',
    external_otel_collector: 'external'
  }[value.kind];
  const transportsMatch = value.supportedTransports.every(transport => Boolean(value.endpoints[transport]));
  return (
    Boolean(value.gateway) &&
    value.supportedTransports.length > 0 &&
    value.supportedTransports.length === endpointCount &&
    transportsMatch &&
    hasConsistentAuthentication(value) &&
    (value.kind === 'external_otel_collector' || value.authentication === 'bearer_token') &&
    !value.errorCode &&
    value.gateway === expectedGateway &&
    hasValidCollectorIdentity(value)
  );
}

function hasConsistentAuthentication(value: IntakeProfile) {
  if (value.authentication === 'none') return value.authorizationHeader === null;
  return value.authentication === 'bearer_token' && value.authorizationHeader === 'Authorization';
}

function hasAdvertisedConnectivity(value: IntakeProfile) {
  return Boolean(
    value.gateway ||
    value.supportedTransports.length ||
    Object.values(value.endpoints).length ||
    value.authentication ||
    value.authorizationHeader ||
    !value.errorCode ||
    !hasValidCollectorIdentity(value)
  );
}

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

const secretPlaceholders = z
  .object({
    authorizationToken: z
      .object({ marker: z.literal('${HERTZBEAT_TOKEN}'), kind: z.literal('authorization_token') })
      .strict()
      .optional()
  })
  .strict();

export const renderSchema = z
  .object({
    schemaVersion: z.literal(2),
    sourceKind: z.enum(SOURCE_KINDS),
    recipeId: text,
    intakeProfile,
    service,
    signals: signalValues(capability),
    components: z.array(component),
    secretPlaceholders,
    blocks: z.array(guideBlock)
  })
  .strict()
  .superRefine(validateRenderAuthentication);

type RenderResponse = z.infer<typeof renderSchema>;

function validateRenderAuthentication(value: RenderResponse, context: z.RefinementCtx) {
  const available = value.intakeProfile.availability === 'available';
  const bearer = value.intakeProfile.authentication === 'bearer_token';
  const declared = Boolean(value.secretPlaceholders.authorizationToken);
  const references = value.blocks.some(block => block.placeholders.includes('authorizationToken'));
  const leakedMarker = value.blocks.some(
    block => block.content?.includes('${HERTZBEAT_TOKEN}') && !block.placeholders.includes('authorizationToken')
  );
  const unauthenticatedAuthorization = value.blocks.some(block => block.content?.includes('Authorization'));
  if (
    !available ||
    bearer !== declared ||
    bearer !== references ||
    leakedMarker ||
    (!bearer && unauthenticatedAuthorization)
  ) {
    context.addIssue({ code: 'custom', message: 'render authentication guidance is inconsistent' });
  }
}

export const messageEnvelopeSchema = z
  .object({ code: z.number().int(), msg: z.string().nullable().optional(), data: z.unknown() })
  .strict();
