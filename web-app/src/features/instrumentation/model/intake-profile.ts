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

import type { IntakeProfile, IntakeProfilesResponse } from './instrumentation-v2-contract';

// Keep the operator's shortest-to-most-managed route order independent of backend response order.
export const INTAKE_PROFILE_KINDS = ['server', 'hertzbeat_collector', 'external_otel_collector'] as const;

export type IntakeProfileKind = (typeof INTAKE_PROFILE_KINDS)[number];

type Profile = IntakeProfile;
type Transport = keyof Profile['endpoints'];
type Endpoint = NonNullable<Profile['endpoints'][Transport]>;

export function intakeEndpointEntries(profile: Profile): Array<[Transport, Endpoint]> {
  const entries: Array<[Transport, Endpoint]> = [];
  if (profile.endpoints.http_protobuf) entries.push(['http_protobuf', profile.endpoints.http_protobuf]);
  if (profile.endpoints.grpc) entries.push(['grpc', profile.endpoints.grpc]);
  return entries;
}

export function profileUsesPlaintext(profile: Profile | undefined) {
  return Boolean(profile && intakeEndpointEntries(profile).some(([, endpoint]) => endpoint.security === 'plaintext'));
}

export function profileRequiresToken(profile: Profile | undefined) {
  return profile?.availability === 'available' && profile.authentication === 'bearer_token';
}

export function profileCanRender(profile: Profile | undefined, token: string) {
  if (profile?.availability !== 'available') return false;
  if (profile.authentication === 'none') return true;
  return profile.authentication === 'bearer_token' && Boolean(token.trim());
}

export function profilesForKind(profiles: IntakeProfilesResponse, kind: IntakeProfileKind) {
  return profiles.profiles.filter(profile => profile.kind === kind);
}
