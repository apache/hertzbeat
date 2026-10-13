import { parseLogAnalysis, validLogAnalysis } from '@/platform/perses';
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

export function canonicalExploreReturnPath(
  value: string | null | undefined,
  canonicalize: (params: URLSearchParams) => string
): string | undefined {
  if (!value || value.length > 8192 || !value.startsWith('/explore?') || /[#\\\r\n]/u.test(value)) return undefined;
  const params = new URLSearchParams(value.slice('/explore?'.length));
  const signal = params.get('signal');
  if (signal !== 'logs' && signal !== 'traces') return undefined;
  if (!isListReturnParams(params)) return undefined;
  if (!validReturnIdentities(params)) return undefined;
  const canonical = canonicalize(params);
  return canonical === value ? canonical : undefined;
}

function validReturnIdentities(params: URLSearchParams) {
  const traceId = params.get('traceId');
  const spanId = params.get('spanId');
  return (
    (traceId == null || (/^[0-9a-f]{32}$/u.test(traceId) && !/^0+$/u.test(traceId))) &&
    (spanId == null || (/^[0-9a-f]{16}$/u.test(spanId) && !/^0+$/u.test(spanId)))
  );
}

function isListReturnParams(params: URLSearchParams) {
  if (params.has('returnTo') || params.has('logRecordUid')) return false;
  if (params.get('signal') !== 'traces' || !params.has('traceId')) return true;
  return !['start', 'end', 'timeZone'].some(field => params.has(field));
}

export function isAnalysisReturnPath(value: string | undefined) {
  if (!value) return false;
  const params = new URLSearchParams(value.split('?')[1]);
  const analysis = params.get('logAnalysis');
  return (
    params.get('signal') === 'logs' &&
    Boolean(analysis) &&
    validLogAnalysis(analysis ?? undefined) &&
    parseLogAnalysis(analysis!).representation !== 'logs'
  );
}
