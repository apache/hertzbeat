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

import { Alert, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar, OperationalPage, OperationalPageHeader } from '@/shared/operational-page';

import type { EntityRecord } from '../model/entity-contract';
import { EntityDetailContext } from './entity-detail-context';
import { EntityDetailNavigation, EntityDetailSection } from './entity-detail-navigation';
import type { EntityExploreSignal } from '../model/entity-operational-navigation';
import type { EntitySignalViewState } from '../model/entity-signal-view-model';
import { EntityIdentityMetadata } from './entity-detail-metadata';
import { EntitySignalView } from './entity-signal-view';

type DegradedEntityDetailActions = {
  refresh: () => void;
  back: () => void;
  edit: () => void;
  definition: () => void;
  explore: (signal: EntityExploreSignal) => void;
  topology: () => void;
  remove: () => void;
};

type DegradedEntityDetailProps = {
  entity: EntityRecord;
  state: { deleting: boolean; refreshing: boolean; canWrite: boolean; canDelete: boolean };
  actions: DegradedEntityDetailActions;
  signals?: EntitySignalViewState | undefined;
};

export function DegradedEntityDetail({ entity, state, actions, signals }: DegradedEntityDetailProps) {
  const { t } = useTranslation();
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={entity.displayName || entity.name}
        description={<EntityDetailContext entity={entity} unavailable />}
        actions={
          <Space wrap>
            <Button disabled={state.refreshing} loading={state.refreshing} onClick={actions.refresh}>
              {t('common.refresh')}
            </Button>
            <Button onClick={actions.back}>{t('common.back')}</Button>
          </Space>
        }
      />
      <OperationalCommandBar
        primary={
          state.canWrite ? (
            <Space wrap>
              <Button onClick={actions.edit}>{t('common.edit')}</Button>
              <Button onClick={actions.definition}>{t('entity.definition.action')}</Button>
            </Space>
          ) : undefined
        }
        secondary={
          state.canDelete ? (
            <Button danger disabled={state.deleting} loading={state.deleting} onClick={actions.remove}>
              {t('entity.delete.action')}
            </Button>
          ) : undefined
        }
      />
      <EntityDetailNavigation
        chapters={[
          ...(signals ? [{ id: 'entity-signals', label: 'entity.signals.title' }] : []),
          { id: 'entity-details', label: 'entity.sections.details' }
        ]}
      />
      <Alert
        showIcon
        type="warning"
        message={t('entity.degraded.title')}
        description={t('entity.degraded.description')}
      />
      {signals ? (
        <EntityDetailSection id="entity-signals" label={t('entity.signals.title')}>
          <EntitySignalView state={signals} openSignal={actions.explore} openTopology={actions.topology} />
        </EntityDetailSection>
      ) : null}
      <EntityIdentityMetadata entity={entity} />
    </OperationalPage>
  );
}
