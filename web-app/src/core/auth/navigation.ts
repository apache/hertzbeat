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

import { isSensitiveFieldName, normalizeSecurityFieldName } from '@/core/security/sensitive-field';

const LOCAL_URL_BASE = 'https://hertzbeat.local';
const MAX_NESTED_REDIRECT_DEPTH = 4;
const redirectFieldNames = new Set(['redirect', 'redirectto', 'returnto', 'returnurl', 'continue', 'next']);

export const loginPath = '/passport/login';
export const sessionLockPath = '/passport/lock';
export const defaultAuthenticatedPath = '/dashboard';

export function safeRedirectTarget(value?: string | null) {
  return sanitizeLocalTarget(value, 0);
}

export function loginHref(returnTo?: string | null) {
  const target = safeRedirectTarget(returnTo);
  return target ? `${loginPath}?redirect=${encodeURIComponent(target)}` : loginPath;
}

function sanitizeLocalTarget(value: string | null | undefined, depth: number): string | null {
  const target = value?.trim();
  if (!target || depth > MAX_NESTED_REDIRECT_DEPTH || !target.startsWith('/') || target.startsWith('//')) {
    return null;
  }

  try {
    const decodedTarget = decodeURI(target);
    if (decodedTarget.includes('\\')) return null;
    const parsed = new URL(target, LOCAL_URL_BASE);
    const decodedPathname = decodeURIComponent(parsed.pathname);
    if (parsed.origin !== LOCAL_URL_BASE || /^\/(?:passport|login)(?:\/|$)/i.test(decodedPathname)) return null;

    const search = sanitizeParameters(parsed.searchParams, depth);
    const hash = sanitizeHash(parsed.hash, depth);
    return `${parsed.pathname}${search ? `?${search}` : ''}${hash}`;
  } catch {
    return null;
  }
}

function sanitizeParameters(parameters: URLSearchParams, depth: number) {
  const sanitized = new URLSearchParams();
  for (const [field, value] of parameters) {
    if (isSensitiveFieldName(field)) continue;
    if (!isRedirectFieldName(field)) {
      sanitized.append(field, value);
      continue;
    }

    // Dropping an over-depth redirect is safer than copying an uninspected target into another URL.
    if (depth >= MAX_NESTED_REDIRECT_DEPTH) continue;
    const nestedTarget = sanitizeLocalTarget(value, depth + 1);
    if (nestedTarget) sanitized.append(field, nestedTarget);
  }
  return sanitized.toString();
}

function sanitizeHash(hash: string, depth: number) {
  if (!hash) return '';
  const fragment = hash.slice(1);
  if (fragment.startsWith('/')) {
    const nestedTarget = sanitizeLocalTarget(fragment, depth + 1);
    return nestedTarget ? `#${nestedTarget}` : '';
  }

  const querySeparator = fragment.indexOf('?');
  if (querySeparator >= 0) {
    const anchor = fragment.slice(0, querySeparator);
    const parameters = sanitizeParameters(new URLSearchParams(fragment.slice(querySeparator + 1)), depth);
    if (parameters) return `#${anchor}?${parameters}`;
    return anchor ? `#${anchor}` : '';
  }

  if (!/[=&]/u.test(fragment)) return hash;
  const parameters = sanitizeParameters(new URLSearchParams(fragment), depth);
  return parameters ? `#${parameters}` : '';
}

function isRedirectFieldName(fieldName: string) {
  return redirectFieldNames.has(normalizeSecurityFieldName(fieldName));
}
