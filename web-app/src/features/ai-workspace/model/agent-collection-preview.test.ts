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

import { describe, it, expect } from 'vitest';
import { isAgentCollectionPreview } from './agent-collection-preview';
const fixture = () => ({
  version: 'inline-collection.v1',
  planId: '11111111-1111-1111-1111-111111111111',
  monitorId: 42,
  sourceRevision: 'b'.repeat(64),
  planHash: 'c'.repeat(64),
  collector: 'main-default-collector',
  operatingSystem: 'Fixture OS',
  account: 'fixture-user',
  directory: '/tmp',
  argv: ['bash', '-c', 'printf fixture'],
  oneShot: true,
  expiresAt: Date.now() + 300000
});
describe('fixed inline collection display contract', () => {
  it('accepts only a complete bounded local one-shot plan', () =>
    expect(isAgentCollectionPreview(fixture())).toBe(true));
  it('rejects extra secret fields, remote nodes, file arguments and recurring execution', () => {
    expect(isAgentCollectionPreview({ ...fixture(), password: 'PRIVATE' })).toBe(false);
    expect(isAgentCollectionPreview({ ...fixture(), collector: 'remote' })).toBe(false);
    expect(isAgentCollectionPreview({ ...fixture(), oneShot: false })).toBe(false);
    expect(isAgentCollectionPreview({ ...fixture(), argv: ['bash', '/tmp/file.sh'] })).toBe(false);
    expect(isAgentCollectionPreview({ ...fixture(), argv: ['bash', '-c', 'x'.repeat(16385)] })).toBe(false);
  });
});
