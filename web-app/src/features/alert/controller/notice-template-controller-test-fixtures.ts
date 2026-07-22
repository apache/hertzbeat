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

import { NoticeTemplateRequestFailure } from '../model/notice-template-failure';
import { noticeTemplateResourceRecord } from '../notice-template-model';

export const record = noticeTemplateResourceRecord({
  id: 42,
  name: 'Custom',
  type: 1,
  preset: false,
  content: '${content}'
});

export const anotherRecord = noticeTemplateResourceRecord({
  id: 43,
  name: 'Another',
  type: 1,
  preset: false,
  content: '${another}'
});

export const preset = noticeTemplateResourceRecord({
  name: 'Built-in',
  type: 1,
  preset: true,
  content: '${content}'
});

export function missingFailure() {
  return new NoticeTemplateRequestFailure('missing', 'rejected', {
    code: 'NOTICE_TEMPLATE_NOT_FOUND'
  });
}

export function unavailableFailure() {
  return new NoticeTemplateRequestFailure('unavailable', 'uncertain');
}

export function invalidFailure() {
  return new NoticeTemplateRequestFailure('invalid', 'uncertain', {
    code: 'NOTICE_TEMPLATE_RESPONSE_INVALID'
  });
}

export function rejectedFailure() {
  return new NoticeTemplateRequestFailure('invalid', 'rejected', {
    code: 'NOTICE_TEMPLATE_VARIABLES_INVALID'
  });
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
