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

import type { TFunction } from 'i18next';

import type { HertzBeatPersesPrimitiveMessages } from '@/platform/perses';

type InvestigationMessageScope = {
  root: string;
  empty: string;
  unavailable: string;
};

const defaultScope: InvestigationMessageScope = {
  root: 'exploreInvestigation',
  empty: 'query.empty',
  unavailable: 'query.unavailable'
};

export function investigationPrimitiveMessages(
  t: TFunction,
  { root, empty, unavailable }: InvestigationMessageScope = defaultScope
): HertzBeatPersesPrimitiveMessages {
  const key = (suffix: string) => `${root}.${suffix}`;
  return {
    loading: t(key('query.loading')),
    empty: t(key(empty)),
    truncated: t(key('query.truncated')),
    truncationUnknown: t(key('query.truncationUnknown')),
    runtimeError: t(key('query.runtimeError')),
    failures: {
      'perses.query.invalid': t(key('query.invalid')),
      'perses.query.permission': t(key('query.permission')),
      'perses.query.overloaded': t(key('query.overloaded')),
      'perses.query.unavailable': t(key(unavailable)),
      'perses.query.contract': t(key('query.contract'))
    }
  };
}
