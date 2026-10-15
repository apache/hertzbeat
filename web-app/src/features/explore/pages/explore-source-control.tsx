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

import { useTranslation } from 'react-i18next';
import { ExploreSourceSelector } from '../components/explore-source-selector';
import { useTelemetrySource } from '../controller/use-telemetry-source';
import type { ExploreQuery, ExploreQueryPatch } from '../model/explore-query';

export function ExploreSourceControl({
  query,
  updateQuery
}: {
  query: ExploreQuery;
  updateQuery: (changes: ExploreQueryPatch) => void;
}) {
  const { t } = useTranslation();
  const state = useTelemetrySource(query);
  return <ExploreSourceSelector {...state} t={t} onChange={source => updateQuery({ source })} />;
}
