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

import { describe, expect, it } from 'vitest';

import { safeTokenReturnTo } from './token-navigation-model';

describe('token navigation model', () => {
  it('accepts only the canonical alert integration handoff', () => {
    expect(safeTokenReturnTo('/alerts/integrations/alertmanager')).toBe('/alerts/integrations/alertmanager');
    expect(safeTokenReturnTo('/alerts/integrations/prometheus')).toBe('/alerts/integrations/prometheus');
  });

  it.each([
    null,
    '',
    'https://evil.example/alerts/integrations/webhook',
    '//evil.example/alerts/integrations/webhook',
    '/alerts/integrations/webhook?token=private',
    '/alerts/integrations/webhook#secret',
    '/alerts/integrations/webhook/extra',
    '/alerts/integrations/%2E%2E%2Fsettings'
  ])('rejects an unsafe or non-canonical return target: %s', value => {
    expect(safeTokenReturnTo(value)).toBeNull();
  });
});
