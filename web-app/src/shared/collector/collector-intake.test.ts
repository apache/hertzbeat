/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  collectorIntakeCanBeCleared,
  collectorIntakeState,
  parseCollectorIntakeAdvertisementRequest,
  parseCollectorInstrumentationIntake
} from './collector-intake';

describe('Collector intake advertisement request', () => {
  it('accepts only the exact frozen v1 capability and endpoint shape', () => {
    expect(
      parseCollectorIntakeAdvertisementRequest({
        schemaVersion: 1,
        gateway: 'server',
        capabilities: ['otlp_http_protobuf', 'otlp_grpc'],
        otlpHttpEndpoint: 'https://telemetry.example.test/v1/metrics',
        otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
      })
    ).toEqual({
      schemaVersion: 1,
      gateway: 'server',
      capabilities: ['otlp_http_protobuf', 'otlp_grpc'],
      otlpHttpEndpoint: 'https://telemetry.example.test/v1/metrics',
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
    });
  });

  it('accepts an explicit safe HTTP endpoint for trusted private or local intake', () => {
    expect(
      parseCollectorIntakeAdvertisementRequest({
        schemaVersion: 1,
        gateway: 'collector',
        capabilities: ['otlp_grpc'],
        otlpHttpEndpoint: null,
        otlpGrpcEndpoint: 'http://10.0.0.7:4317'
      })
    ).toEqual({
      schemaVersion: 1,
      gateway: 'collector',
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'http://10.0.0.7:4317'
    });
  });

  it.each([
    { capabilities: [], otlpHttpEndpoint: null, otlpGrpcEndpoint: null },
    {
      capabilities: ['otlp_grpc', 'otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
    },
    { capabilities: ['otlp_http_protobuf'], otlpHttpEndpoint: null, otlpGrpcEndpoint: null },
    {
      capabilities: ['otlp_http_protobuf'],
      otlpHttpEndpoint: 'https://telemetry.example.test/v1/metrics',
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'ftp://telemetry.example.test:4317'
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'https://user:secret@telemetry.example.test:4317'
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317?token=secret'
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317#secret'
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'http://'
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'http:telemetry.example.test:4317'
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'http:/telemetry.example.test:4317'
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'http:///telemetry.example.test:4317'
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317',
      token: 'must-not-enter-request'
    }
  ])('rejects unsafe or incoherent request %#', unsafe => {
    expect(parseCollectorIntakeAdvertisementRequest({ schemaVersion: 1, gateway: 'collector', ...unsafe })).toBeNull();
  });
});

describe('Collector intake safe state', () => {
  it.each([
    {
      capabilities: ['otlp_http_protobuf'],
      otlpHttpEndpoint: 'https://telemetry.example.test/v1/metrics',
      otlpGrpcEndpoint: null
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
    },
    {
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'http://10.0.0.7:4317'
    }
  ] as const)('accepts a capability-matched single endpoint', intake => {
    expect(parseCollectorInstrumentationIntake(availableIntake(intake), 'edge')).toEqual({
      status: 'available',
      schemaVersion: 1,
      collectorId: 'edge',
      gateway: 'server',
      authorizationHeader: 'Authorization',
      ...intake
    });
  });

  it.each([
    { capabilities: [], otlpHttpEndpoint: null, otlpGrpcEndpoint: null },
    {
      capabilities: ['otlp_http_protobuf'],
      otlpHttpEndpoint: 'https://telemetry.example.test/v1/metrics',
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
    }
  ] as const)('rejects a both-null or capability-mismatched available intake', intake => {
    expect(parseCollectorInstrumentationIntake(availableIntake(intake), 'edge')).toEqual({
      status: 'unavailable',
      errorCode: 'intake_advertisement_invalid'
    });
  });

  it.each([
    [
      {
        status: 'available',
        schemaVersion: 1,
        collectorId: 'edge',
        gateway: 'server',
        capabilities: ['otlp_grpc'],
        otlpHttpEndpoint: null,
        otlpGrpcEndpoint: 'https://telemetry.example.test:4317',
        authorizationHeader: 'Authorization'
      },
      'available',
      true
    ],
    [{ status: 'unavailable', errorCode: 'intake_not_advertised' }, 'notAdvertised', false],
    [{ status: 'unavailable', errorCode: 'intake_advertisement_invalid' }, 'invalid', true],
    [{ status: 'unavailable', errorCode: 'intake_advertisement_unavailable' }, 'unavailable', true]
  ] as const)('maps %j to %s with clear=%s', (intake, state, clearable) => {
    expect(collectorIntakeState(intake)).toBe(state);
    expect(collectorIntakeCanBeCleared(intake)).toBe(clearable);
  });
});

function availableIntake(intake: {
  capabilities: readonly ('otlp_http_protobuf' | 'otlp_grpc')[];
  otlpHttpEndpoint: string | null;
  otlpGrpcEndpoint: string | null;
}) {
  return {
    schemaVersion: 1,
    collectorId: 'edge',
    state: 'available',
    gateway: 'server',
    authorizationHeader: 'Authorization',
    errorCode: null,
    ...intake
  };
}
