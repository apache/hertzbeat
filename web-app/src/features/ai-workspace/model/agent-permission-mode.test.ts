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
import {
  permissionReviewRemaining,
  permissionChallengeExpired,
  effectivePermissionMode
} from './agent-permission-mode';
const challenge = {
  sessionUid: 'ags-test',
  challengeId: '123e4567-e89b-42d3-a456-426614174000',
  generation: 1,
  notBefore: 15000,
  expiresAt: 130000,
  serverNow: 10000,
  noticeVersion: 1
};
describe('permission timing reflects the server review window', () => {
  it('requires a full review period after the response arrives and handles clock skew conservatively', () => {
    expect(permissionReviewRemaining(challenge, 100000, 100000)).toBe(5);
    expect(permissionReviewRemaining(challenge, 100000, 104999)).toBe(1);
    expect(permissionReviewRemaining(challenge, 100000, 105000)).toBe(0);
    expect(permissionReviewRemaining(challenge, 100000, 99900)).toBe(5);
    expect(permissionChallengeExpired(challenge, 100000, 220000)).toBe(true);
  });
  it('stops displaying an active full grant at expiry', () => {
    const view = {
      sessionUid: 'ags-test',
      mode: 'FULL' as const,
      expiresAt: 11000,
      serverNow: 10000,
      fullAllowed: true
    };
    expect(effectivePermissionMode(view, 100000, 100999)).toBe('FULL');
    expect(effectivePermissionMode(view, 100000, 101000)).toBe('MANUAL');
  });
});
