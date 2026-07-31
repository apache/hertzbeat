/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { IntakeProfilesResponse } from './instrumentation-v2-contract';

type Profile = IntakeProfilesResponse['profiles'][number];
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
