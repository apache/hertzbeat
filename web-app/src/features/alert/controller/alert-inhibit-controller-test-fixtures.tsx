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

import type { AlertInhibit, AlertInhibitQuery } from '../model/alert-inhibit-model';

export const persistedAlertInhibit: AlertInhibit = {
  id: 7,
  name: 'Critical suppresses warning',
  sourceLabels: { severity: 'critical', service: 'api' },
  targetLabels: { severity: 'warning', service: 'api' },
  equalLabels: ['service', 'instance'],
  enable: true,
  gmtUpdate: '2026-07-17T09:00:00'
};

export function validAlertInhibitDraft() {
  return {
    name: 'Critical suppresses warning',
    sourceLabelsText: 'severity:critical, service:api',
    targetLabelsText: 'severity:warning, service:api',
    equalLabels: ['service', 'instance'],
    enable: true
  };
}

export function alertInhibitPage(query: AlertInhibitQuery, content: AlertInhibit[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: Math.ceil(content.length / query.pageSize),
    number: query.pageIndex,
    size: query.pageSize
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
