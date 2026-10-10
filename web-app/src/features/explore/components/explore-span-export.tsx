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
import { saveBrowserDownload } from '@/shared/browser-download';
import { spanPageCsv } from '../model/explore-span-export';
import type { TraceSpanRow } from '../model/explore-trace-analytics';
export function ExploreSpanExport({
  rows,
  pageIndex,
  current
}: {
  rows: TraceSpanRow[];
  pageIndex: number;
  current: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Button
      disabled={!current || rows.length === 0}
      onClick={() =>
        saveBrowserDownload({
          filename: `hertzbeat-spans-page-${pageIndex + 1}.csv`,
          data: new Blob(['\uFEFF', spanPageCsv(rows)], { type: 'text/csv;charset=utf-8' })
        })
      }
    >
      {t('exploreTrace.exportCurrentPage')}
    </Button>
  );
}
