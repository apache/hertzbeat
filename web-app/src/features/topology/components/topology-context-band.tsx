/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
