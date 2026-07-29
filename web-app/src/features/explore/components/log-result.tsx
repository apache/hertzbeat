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

import { Alert } from 'antd';
import type { TFunction } from 'i18next';

import type { ExplorePageResult, LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-model';
import { LogRows } from './log-rows';
import { LogStreamResult, type LiveLogView } from './log-stream-result';
import { SignalEmptyState, SignalResultFrame } from './signal-result-frame';

export type { LiveLogView } from './log-stream-result';

export function LogResult({
  data,
  query,
  t,
  navigate,
  evidenceCurrent = true,
  live
}: {
  data?: ExplorePageResult<LogRow> | undefined;
  query: LogExploreQuery;
  t: TFunction;
  navigate: (path: string) => void;
  evidenceCurrent?: boolean | undefined;
  live?: LiveLogView | undefined;
}) {
  if (query.live && live) return <LogStreamResult stream={live} query={query} t={t} navigate={navigate} />;
  if (query.live) return <Alert type="error" showIcon message={t('exploreLog.streamFailed')} />;

  if (!data || data.totalElements === 0) {
    return (
      <SignalResultFrame title={t('explore.signals.logs')} count={0}>
        <SignalEmptyState title={t('explore.empty.logs')} hint={t('explore.description')} />
      </SignalResultFrame>
    );
  }

  return (
    <LogRows
      rows={data.content}
      data={data}
      query={query}
      t={t}
      navigate={navigate}
      evidenceCurrent={evidenceCurrent}
    />
  );
}
