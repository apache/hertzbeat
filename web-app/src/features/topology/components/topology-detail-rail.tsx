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

import { Drawer, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { TopologyPageActions } from '../model/topology-page-contract';
import type { TopologyQuery } from '../model/topology-model';
import { resolveTopologyInspectorSelection } from '../model/topology-inspector-model';
import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';
import { TopologyInspectorContent } from './topology-inspector-content';
import styles from './topology-inspector.module.css';

type Props = {
  compact: boolean;
  interaction: TopologyInteraction;
  presentation: TopologyPresentation;
  query: TopologyQuery | undefined;
  actions: Pick<TopologyPageActions, 'openEntity' | 'querySignals'>;
  onClose: () => void;
};

export function TopologyInspector({ compact, interaction, presentation, query, actions, onClose }: Props) {
  const { t } = useTranslation();
  const selected = resolveTopologyInspectorSelection(interaction.selected, presentation);
  const title = t('topology.detail.title');
  const content = selected ? (
    <TopologyInspectorContent selected={selected} window={query?.window} actions={actions} />
  ) : null;
  if (compact) {
    return (
      <Drawer open={Boolean(selected)} width="min(420px, 100vw)" title={title} onClose={onClose} destroyOnHidden>
        {content}
      </Drawer>
    );
  }
  return (
    <aside className={styles.detailRail} aria-label={title}>
      <div className={styles.inspectorHeading}>
        <Typography.Title level={5}>{title}</Typography.Title>
      </div>
      {!selected ? <OperationalStatePanel kind="empty" title={t('topology.detail.none')} /> : content}
    </aside>
  );
}
