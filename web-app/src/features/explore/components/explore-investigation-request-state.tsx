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
import { ExploreLoadingResult, ExploreMessageResult } from './explore-state-panel';

export function InvestigationRequestState({
  state,
  retry,
  t
}: {
  state: 'inactive' | 'invalid' | 'loading' | 'unavailable' | 'contract_error';
  retry: () => Promise<void>;
  t: TFunction;
}) {
  if (state === 'loading') return <ExploreLoadingResult />;
  if (state === 'unavailable' || state === 'contract_error') {
    return (
      <ExploreMessageResult
        kind={state === 'unavailable' ? 'unavailable' : 'error'}
        message={t(
          state === 'unavailable' ? 'exploreInvestigation.query.unavailable' : 'exploreInvestigation.query.contract'
        )}
        retry={retry}
        retryLabel={t('common.retry')}
      />
    );
  }
  return null;
}
