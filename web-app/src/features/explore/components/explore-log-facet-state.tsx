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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
export type FacetRead<T> = {
  state:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'error'
    | 'permission'
    | 'unavailable'
    | 'calculated_budget_exceeded'
    | 'calculated_invalid_pattern';
  data?: T | undefined;
};
export function FacetReadState({
  state,
  unavailable,
  onRetry
}: {
  state: FacetRead<unknown>['state'];
  unavailable: boolean | undefined;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (state === 'ready' && !unavailable) return null;
  if (state === 'calculated_budget_exceeded' || state === 'calculated_invalid_pattern')
    return (
      <div role="alert">
        <p>
          {t(
            state === 'calculated_budget_exceeded'
              ? 'explore.logCalculatedV2.queryBudgetExceeded'
              : 'explore.logCalculatedV2.queryInvalidPattern'
          )}
        </p>
      </div>
    );
  const key = unavailable ? 'unavailable' : state;
  return (
    <div role={state === 'error' ? 'alert' : 'status'}>
      <p>{t(`explore.logFacets.states.${key}`)}</p>
      {state === 'error' && <Button onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  );
}
