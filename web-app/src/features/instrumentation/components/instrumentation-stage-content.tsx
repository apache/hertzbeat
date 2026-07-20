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

import { Empty, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

import type { CatalogResponse } from '../model/instrumentation-contract';
import { InstrumentationContextStage, type InstrumentationContextSetup } from './instrumentation-context-stage';
import { InstrumentationSelectionStage, type InstrumentationSelectionSetup } from './instrumentation-selection-stage';
import { ResourceError } from './instrumentation-stage';

export type InstrumentationStageContentSetup = InstrumentationContextSetup &
  InstrumentationSelectionSetup & {
    catalog: CatalogResponse | undefined;
    catalogPending: boolean;
    catalogError: boolean;
    retryCatalog: () => Promise<unknown>;
  };

export function InstrumentationStageContent({ setup }: { setup: InstrumentationStageContentSetup }) {
  const { t } = useTranslation();
  if (setup.catalogPending) return <Skeleton active paragraph={{ rows: 5 }} />;
  if (setup.catalogError || !setup.catalog) {
    return <ResourceError title={t('instrumentation.catalogUnavailable')} onRetry={() => void setup.retryCatalog()} />;
  }
  if (setup.catalog.languages.length === 0) return <Empty description={t('instrumentation.catalogEmpty')} />;
  if (setup.stage < 3) return <InstrumentationSelectionStage setup={setup} />;
  return <InstrumentationContextStage setup={setup} />;
}
