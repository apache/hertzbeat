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

  it.each(['token', 'ACCESS_TOKEN', 'authorization', 'pass-word', 'credential', 'secret', 'client.secret', 'api-key'])(
    'removes the sensitive direct-entry query field %s before creating a login URL',
    field => {
      const href = loginHref(`/explore?serviceName=checkout&${field}=must-not-leak&pageIndex=2`);
      const redirect = new URL(href, 'https://hertzbeat.local').searchParams.get('redirect');

      expect(redirect).toBe('/explore?serviceName=checkout&pageIndex=2');
      expect(href).not.toContain('must-not-leak');
    }
  );

  it('cleans structured hash parameters without discarding an ordinary hash route or anchor', () => {
    expect(safeRedirectTarget('/explore#?tab=logs&Access.Token=must-not-leak')).toBe('/explore#?tab=logs');
    expect(safeRedirectTarget('/explore#/traces?traceId=abc&client_secret=must-not-leak')).toBe(
      '/explore#/traces?traceId=abc'
    );
    expect(safeRedirectTarget('/bulletin?pageIndex=2#details')).toBe('/bulletin?pageIndex=2#details');
  });

  it('recursively cleans nested local redirects and discards unsafe nested targets', () => {
    const nested = new URLSearchParams({
      redirect: '/explore?serviceName=checkout&apiKey=must-not-leak',
      timeRange: 'last-30m'
    });
    expect(safeRedirectTarget(`/dashboard?${nested.toString()}`)).toBe(
      '/dashboard?redirect=%2Fexplore%3FserviceName%3Dcheckout&timeRange=last-30m'
    );
    expect(safeRedirectTarget('/dashboard?redirect=https%3A%2F%2Fevil.example&pageIndex=2')).toBe(
      '/dashboard?pageIndex=2'
    );
    const doubleEncoded = new URLSearchParams({
      redirect: encodeURIComponent('/explore?apiKey=must-not-leak'),
      pageIndex: '2'
    });
    expect(safeRedirectTarget(`/dashboard?${doubleEncoded.toString()}`)).toBe('/dashboard?pageIndex=2');
  });

  it('bounds nested redirect cleaning and drops any target beyond the audit depth', () => {
    let target = '/leaf?token=must-not-leak';
    for (let depth = 0; depth < 8; depth += 1) {
      target = `/hop-${depth}?redirect=${encodeURIComponent(target)}`;
    }

    const cleaned = safeRedirectTarget(target);
    expect(cleaned).not.toContain('must-not-leak');
    expect(countNestedRedirects(cleaned)).toBe(4);
  });

  it('keeps ordinary local filters, pagination, and time context', () => {
    const target = '/explore?serviceName=checkout&environment=prod&pageIndex=2&start=1000&end=2000#trace-row';
    expect(safeRedirectTarget(target)).toBe(target);
  });

  it.each([
    'https://evil.example/path',
    '//evil.example/path',
    '/\\evil.example/path',
    '/%5Cevil.example/path',
    '/%70assport/login',
    '/%70assport%2Flogin',
    '/%6Cogin',
    '/%6Cogin%2Fcallback',
    '/explore?query=%E0%A4%A'
  ])('discards an external, protocol-relative, or malformed redirect target: %s', target => {
    expect(safeRedirectTarget(target)).toBeNull();
    expect(loginHref(target)).toBe('/passport/login');
  });
});

function countNestedRedirects(initial: string | null) {
  let count = 0;
  let current = initial;
  while (current) {
    const next = new URL(current, 'https://hertzbeat.local').searchParams.get('redirect');
    if (!next) break;
    count += 1;
    current = next;
  }
  return count;
}
