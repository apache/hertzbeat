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

import { Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { saveBrowserDownload } from '@/shared/browser-download';
import type { TracePageResult } from '../model/explore-signal-contract';
import { tracePageCsv } from '../model/explore-trace-export';

export function ExploreTraceResultActions({
  data,
  evidenceCurrent
}: {
  data: TracePageResult;
  evidenceCurrent: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Space wrap>
      <small>{t(traceCoverageMessage(data.query), { count: data.query?.rowLimit ?? undefined })}</small>
      <Button
        disabled={!evidenceCurrent || data.content.length === 0}
        onClick={() =>
          saveBrowserDownload({
            filename: `hertzbeat-traces-page-${data.number + 1}.csv`,
            data: new Blob(['\uFEFF', tracePageCsv(data.content)], { type: 'text/csv;charset=utf-8' })
          })
        }
      >
        {t('exploreTrace.exportCurrentPage')}
      </Button>
    </Space>
  );
}

function traceCoverageMessage(query: TracePageResult['query']) {
  if (!query) return 'exploreTrace.coverage.unknown';
  if (query.coverage === 'window') return 'exploreTrace.coverage.window';
  if (query.truncated === true) return 'exploreTrace.coverage.truncated';
  return query.truncated === null ? 'exploreTrace.coverage.boundedUnknown' : 'exploreTrace.coverage.bounded';
}
