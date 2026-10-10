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
