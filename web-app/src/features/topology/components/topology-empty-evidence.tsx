/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { TopologyPageActions } from '../model/topology-page-contract';
import { clearTopologyScopePatch } from '../model/topology-model';

type TopologyEmptyEvidenceProps = {
  actions: TopologyPageActions;
  onRefresh: () => void;
  scope: 'global' | 'filtered';
};

export function TopologyEmptyEvidence({ actions, onRefresh, scope }: TopologyEmptyEvidenceProps) {
  const { t } = useTranslation();
  const filtered = scope === 'filtered';
  return (
    <OperationalStatePanel
      kind="empty"
      title={t(`topology.evidence.${filtered ? 'emptyFiltered' : 'emptyGlobal'}`)}
      description={t(`topology.evidence.${filtered ? 'emptyFilteredDescription' : 'emptyGlobalDescription'}`)}
      action={
        <Space wrap>
          {filtered ? (
            <Button size="small" type="primary" onClick={() => actions.changeScope(clearTopologyScopePatch())}>
              {t('topology.evidence.clearScope')}
            </Button>
          ) : (
            <Button size="small" type="primary" onClick={actions.discoverResources}>
              {t('topology.evidence.discoverResources')}
            </Button>
          )}
          <Button size="small" type="link" onClick={onRefresh}>
            {t('common.refresh')}
          </Button>
          <Button size="small" type="link" onClick={actions.configureTelemetry}>
            {t('topology.evidence.configureTelemetry')}
          </Button>
        </Space>
      }
    />
  );
}
