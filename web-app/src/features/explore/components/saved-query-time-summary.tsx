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

import { useTranslation } from 'react-i18next';
import type { ExploreQuery } from '../model/explore-query';
import { savedQueryWindowLabel } from '../model/explore-saved-query-view-model';
export function SavedQueryTimeSummary({ query }: { query: ExploreQuery }) {
  const { t } = useTranslation();
  if (query.signal === 'logs' && query.live)
    return <span title={t('explore.liveFlow.incoming')}>{t('explore.liveFlow.incomingHint')}</span>;
  return (
    <>
      {t(query.start == null ? 'exploreSaved.relative' : 'exploreSaved.absolute', {
        range: t(`explore.timeRanges.${query.timeRange}`),
        window: savedQueryWindowLabel(query),
        zone: query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
      })}
    </>
  );
}
