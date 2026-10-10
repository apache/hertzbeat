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

import type { ExactTimeWindow } from '@/shared/query-context';
import { useLogInvestigationController } from '../controller/use-log-investigation-controller';
import { ExploreLogContextPane } from '../components/explore-log-context-pane';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogRow } from '../model/explore-signal-contract';
export function ExploreLogContext({
  query,
  row,
  timeWindow,
  evidenceCurrent
}: {
  query: LogExploreQuery;
  row: LogRow;
  timeWindow: ExactTimeWindow;
  evidenceCurrent: boolean;
}) {
  const controller = useLogInvestigationController({
    ...query,
    logRecordUid: evidenceCurrent ? (row.logRecordUid ?? undefined) : undefined,
    start: timeWindow.from,
    end: timeWindow.to,
    timeZone: query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    live: false,
    traceId: undefined,
    spanId: undefined
  });
  return (
    <ExploreLogContextPane
      state={controller.state}
      current={controller.evidenceCurrent}
      evidenceCurrent={evidenceCurrent}
      timeZone={query.timeZone}
      onRetry={() => void controller.refetch()}
    />
  );
}
