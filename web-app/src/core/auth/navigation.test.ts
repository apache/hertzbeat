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

import { loginHref, safeRedirectTarget } from './navigation';

describe('authentication navigation', () => {
  it('accepts only local non-passport redirect targets', () => {
    expect(safeRedirectTarget('/bulletin?search=db')).toBe('/bulletin?search=db');
    expect(safeRedirectTarget('//evil.example')).toBeNull();
    expect(safeRedirectTarget('https://evil.example')).toBeNull();
    expect(safeRedirectTarget('/passport/login')).toBeNull();
  });

  it('encodes the requested route in the login URL', () => {
    expect(loginHref('/bulletin?search=db')).toBe('/passport/login?redirect=%2Fbulletin%3Fsearch%3Ddb');
  });
});
