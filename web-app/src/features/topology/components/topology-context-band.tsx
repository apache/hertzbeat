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

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalPageHeader } from '@/shared/operational-page';

import { formatTopologyWindow } from '../model/topology-display';
import type { TopologyQuery } from '../model/topology-model';
import type { TopologyPresentation } from '../model/topology-view-model';
import styles from './topology-page.module.css';

export function TopologyContextBand({
  presentation,
  query
}: {
  presentation: TopologyPresentation;
  query: TopologyQuery | undefined;
}) {
  const { i18n, t } = useTranslation();
  return (
    <OperationalPageHeader
      title={t('topology.title')}
      description={t('topology.context.subtitle')}
      actions={
        <div className={styles.contextFacts}>
          <ContextFact label={t('topology.summary.displayedNodes')} value={String(presentation.summary.nodeCount)} />
          <ContextFact label={t('topology.summary.displayedEdges')} value={String(presentation.summary.edgeCount)} />
          <ContextFact
            label={t('topology.summary.window')}
            value={formatTopologyWindow(query?.window, i18n.resolvedLanguage || i18n.language)}
          />
        </div>
      }
    />
  );
}

function ContextFact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.contextFact}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Text strong>{value}</Typography.Text>
    </div>
  );
}
