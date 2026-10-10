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
import type { ExploreQuery } from '../model/explore-query';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { validLogSort } from '../model/explore-log-order';
import { logOrderControls } from '../model/explore-log-order-controls';
import { ExploreLogOrderControls } from './explore-log-order';
export function ExploreLogOrderRecovery({
  query,
  submission,
  t
}: {
  query: ExploreQuery;
  submission: ExploreSubmissionViewModel;
  t: TFunction;
}) {
  if (query.signal !== 'logs' || validLogSort(query.logSort, query.sort)) return null;
  return (
    <div role="alert">
      <p>{t('explore.logSort.invalid')}</p>
      <ExploreLogOrderControls query={query} controls={logOrderControls(query, submission)} t={t} />
    </div>
  );
}
