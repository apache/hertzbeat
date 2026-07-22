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

export const COLLECTOR_INTAKE_CAPABILITIES = ['otlp_http_protobuf', 'otlp_grpc'] as const;
export const COLLECTOR_INTAKE_ERROR_CODES = [
  'intake_not_advertised',
  'intake_advertisement_invalid',
  'intake_advertisement_unavailable'
] as const;

type CollectorIntakeCapability = (typeof COLLECTOR_INTAKE_CAPABILITIES)[number];
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

export type CollectorTarget = {
  collectorId: string;
  otlpHttpEndpoint: string;
  otlpGrpcEndpoint: string;
  authorizationHeader: string;
};

export type InstrumentationCollector = {
  name: string;
  collectorId: string;
  address: string;
  online: boolean;
  intake: CollectorInstrumentationIntake;
};

export type InstrumentationCollectorsState =
  { status: 'loading' } | { status: 'ready' } | { status: 'unavailable' } | { status: 'error' };
