/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Drawer, Empty, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

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
      {!selected ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('topology.detail.none')} /> : content}
    </aside>
  );
}
