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

import { describe, expect, it } from 'vitest';

import { parsePublicAccessConfig, PublicAccessConfigContractError } from './public-access-config-schema';

describe('public access config schema', () => {
  it('accepts the exact nullable response contract', () => {
    expect(
      parsePublicAccessConfig({
        publicBaseUrl: null,
        serverOtlpHttpEndpoint: 'https://otel.example.test/v1',
        serverOtlpGrpcEndpoint: null
      })
    ).toEqual({
      publicBaseUrl: null,
      serverOtlpHttpEndpoint: 'https://otel.example.test/v1',
      serverOtlpGrpcEndpoint: null
    });
  });

  it.each([
    {},
    { publicBaseUrl: '', serverOtlpHttpEndpoint: null, serverOtlpGrpcEndpoint: null },
    { publicBaseUrl: 'http://0.0.0.0:1157', serverOtlpHttpEndpoint: null, serverOtlpGrpcEndpoint: null },
    { publicBaseUrl: null, serverOtlpHttpEndpoint: null, serverOtlpGrpcEndpoint: null, password: 'secret' }
  ])('rejects incomplete, blank, or expanded responses', value => {
    expect(() => parsePublicAccessConfig(value)).toThrow(PublicAccessConfigContractError);
  });
});
