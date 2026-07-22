/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

export const COLLECTOR_INTAKE_CAPABILITIES = ['otlp_http_protobuf', 'otlp_grpc'] as const;
export const COLLECTOR_INTAKE_ERROR_CODES = [
  'intake_not_advertised',
  'intake_advertisement_invalid',
  'intake_advertisement_unavailable'
] as const;

export type CollectorIntakeCapability = (typeof COLLECTOR_INTAKE_CAPABILITIES)[number];
type CollectorIntakeErrorCode = (typeof COLLECTOR_INTAKE_ERROR_CODES)[number];

export type CollectorInstrumentationIntake =
  | {
      status: 'available';
      schemaVersion: 1;
      collectorId: string;
      gateway: 'collector' | 'server';
      capabilities: readonly CollectorIntakeCapability[];
      otlpHttpEndpoint: string | null;
      otlpGrpcEndpoint: string | null;
      authorizationHeader: 'Authorization';
    }
  | { status: 'unavailable'; errorCode: CollectorIntakeErrorCode };

export type CollectorIntakeState = 'available' | 'notAdvertised' | 'invalid' | 'unavailable';

export function collectorIntakeState(intake: CollectorInstrumentationIntake): CollectorIntakeState {
  if (intake.status === 'available') return 'available';
  if (intake.errorCode === 'intake_not_advertised') return 'notAdvertised';
  return intake.errorCode === 'intake_advertisement_invalid' ? 'invalid' : 'unavailable';
}

export function collectorIntakeCanBeCleared(intake: CollectorInstrumentationIntake) {
  return collectorIntakeState(intake) !== 'notAdvertised';
}

const trimmedTextSchema = z
  .string()
  .min(1)
  .refine(value => value === value.trim());
const collectorIdSchema = trimmedTextSchema
  .max(128)
  .refine(value => !Array.from(value).some(character => /\p{Cc}/u.test(character)));
const publicHttpsEndpointSchema = trimmedTextSchema.refine(isPublicHttpsEndpoint);
const capabilitySchema = z
  .array(z.enum(COLLECTOR_INTAKE_CAPABILITIES))
  .min(1)
  .max(COLLECTOR_INTAKE_CAPABILITIES.length)
  .superRefine((capabilities, context) => {
    if (new Set(capabilities).size !== capabilities.length) {
      context.addIssue({ code: 'custom', message: 'Collector intake capabilities must be unique' });
    }
  });

export const collectorIntakeAdvertisementRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    gateway: z.enum(['collector', 'server']),
    capabilities: capabilitySchema,
    otlpHttpEndpoint: publicHttpsEndpointSchema.nullable(),
    otlpGrpcEndpoint: publicHttpsEndpointSchema.nullable()
  })
  .strict()
  .superRefine((request, context) => {
    const httpMatches = request.capabilities.includes('otlp_http_protobuf') === (request.otlpHttpEndpoint !== null);
    const grpcMatches = request.capabilities.includes('otlp_grpc') === (request.otlpGrpcEndpoint !== null);
    if (!httpMatches || !grpcMatches) {
      context.addIssue({ code: 'custom', message: 'Collector intake request endpoints must match capabilities' });
    }
  });

export type CollectorIntakeAdvertisementRequest = z.output<typeof collectorIntakeAdvertisementRequestSchema>;

export function parseCollectorIntakeAdvertisementRequest(value: unknown): CollectorIntakeAdvertisementRequest | null {
  const result = collectorIntakeAdvertisementRequestSchema.safeParse(value);
  return result.success ? result.data : null;
}

export const availableCollectorIntakeSchema = z
  .object({
    schemaVersion: z.literal(1),
    collectorId: collectorIdSchema,
    state: z.literal('available'),
    gateway: z.enum(['collector', 'server']),
    capabilities: capabilitySchema,
    otlpHttpEndpoint: publicHttpsEndpointSchema.nullable(),
    otlpGrpcEndpoint: publicHttpsEndpointSchema.nullable(),
    authorizationHeader: z.literal('Authorization'),
    errorCode: z.null()
  })
  .strict()
  .superRefine((intake, context) => {
    const httpMatches = intake.capabilities.includes('otlp_http_protobuf') === (intake.otlpHttpEndpoint !== null);
    const grpcMatches = intake.capabilities.includes('otlp_grpc') === (intake.otlpGrpcEndpoint !== null);
    if (!httpMatches || !grpcMatches) {
      context.addIssue({ code: 'custom', message: 'Collector intake endpoints must match capabilities' });
    }
  });

export const unavailableCollectorIntakeSchema = z
  .object({
    schemaVersion: z.literal(1),
    collectorId: collectorIdSchema,
    state: z.literal('unavailable'),
    gateway: z.null(),
    capabilities: z.array(z.never()).length(0),
    otlpHttpEndpoint: z.null(),
    otlpGrpcEndpoint: z.null(),
    authorizationHeader: z.null(),
    errorCode: z.enum(COLLECTOR_INTAKE_ERROR_CODES)
  })
  .strict();

export function parseCollectorInstrumentationIntake(
  value: unknown,
  registeredCollectorId: string
): CollectorInstrumentationIntake {
  return (
    parseExactCollectorInstrumentationIntake(value, registeredCollectorId) ?? {
      status: 'unavailable',
      errorCode: 'intake_advertisement_invalid'
    }
  );
}

export function parseExactCollectorInstrumentationIntake(
  value: unknown,
  registeredCollectorId: string
): CollectorInstrumentationIntake | null {
  const available = availableCollectorIntakeSchema.safeParse(value);
  if (available.success && available.data.collectorId === registeredCollectorId) {
    return {
      status: 'available',
      schemaVersion: 1,
      collectorId: registeredCollectorId,
      gateway: available.data.gateway,
      capabilities: available.data.capabilities,
      otlpHttpEndpoint: available.data.otlpHttpEndpoint,
      otlpGrpcEndpoint: available.data.otlpGrpcEndpoint,
      authorizationHeader: 'Authorization'
    };
  }
  const unavailable = unavailableCollectorIntakeSchema.safeParse(value);
  if (unavailable.success && unavailable.data.collectorId === registeredCollectorId) {
    return { status: 'unavailable', errorCode: unavailable.data.errorCode };
  }
  return null;
}

function isPublicHttpsEndpoint(value: string) {
  try {
    const endpoint = new URL(value);
    return (
      endpoint.protocol === 'https:' &&
      Boolean(endpoint.hostname) &&
      !endpoint.username &&
      !endpoint.password &&
      !endpoint.search &&
      !endpoint.hash &&
      !/\s/u.test(value)
    );
  } catch {
    return false;
  }
}
