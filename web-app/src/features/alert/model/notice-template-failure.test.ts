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
  NoticeTemplateRequestFailure,
  classifyNoticeTemplateCollectionFailure,
  classifyNoticeTemplateDetailFailure,
  isNoticeTemplateWriteRejection,
  normalizeNoticeTemplateCollectionFailure
} from './notice-template-failure';

describe('Notice Template domain failure evidence', () => {
  it('allows missing only for exact detail reads', () => {
    const missing = new NoticeTemplateRequestFailure('missing', 'rejected');
    expect(classifyNoticeTemplateDetailFailure(missing)).toBe('missing');
    expect(classifyNoticeTemplateCollectionFailure(missing)).toBe('error');
    expect(normalizeNoticeTemplateCollectionFailure(missing)).toMatchObject({
      kind: 'error',
      writeOutcome: 'rejected'
    });
  });

  it('does not infer state or write safety from arbitrary transport-shaped objects', () => {
    const arbitrary = { statusCode: 400, httpStatus: 400, kind: 'http', token: 'private-token' };
    expect(classifyNoticeTemplateDetailFailure(arbitrary)).toBe('error');
    expect(isNoticeTemplateWriteRejection(arbitrary)).toBe(false);
    const normalized = normalizeNoticeTemplateCollectionFailure(arbitrary);
    expect(normalized).toMatchObject({ kind: 'error', writeOutcome: 'uncertain' });
    expect(normalized).not.toHaveProperty('statusCode');
    expect(normalized).not.toHaveProperty('token');
  });

  it('admits only explicit typed rejection as safe to write again', () => {
    expect(isNoticeTemplateWriteRejection(new NoticeTemplateRequestFailure('invalid', 'rejected'))).toBe(true);
    expect(isNoticeTemplateWriteRejection(new NoticeTemplateRequestFailure('unavailable', 'uncertain'))).toBe(false);
  });
});
