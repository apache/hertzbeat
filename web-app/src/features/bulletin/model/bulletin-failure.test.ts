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

import { BulletinRequestFailure, classifyBulletinFailure, isBulletinWriteRejection } from './bulletin-failure';

describe('Bulletin domain failure evidence', () => {
  it('does not trust transport-shaped objects as domain evidence', () => {
    const arbitrary = { status: 422, statusCode: 503, kind: 'unavailable', writeOutcome: 'rejected' };

    expect(classifyBulletinFailure(arbitrary)).toBe('error');
    expect(isBulletinWriteRejection(arbitrary)).toBe(false);
  });

  it('trusts only typed redacted failures', () => {
    const rejected = new BulletinRequestFailure('error', 'rejected');
    const unavailable = new BulletinRequestFailure('unavailable', 'uncertain');

    expect(isBulletinWriteRejection(rejected)).toBe(true);
    expect(isBulletinWriteRejection(unavailable)).toBe(false);
    expect(classifyBulletinFailure(unavailable)).toBe('unavailable');
    expect(JSON.stringify(unavailable)).not.toContain('private');
  });
});
