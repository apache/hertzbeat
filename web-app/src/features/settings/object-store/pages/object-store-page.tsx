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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion,
  OperationalStatePanel,
  type OperationalStateKind
} from '@/shared/operational-page';

import { ObjectStoreEditor } from '../components/object-store-editor';
import { useObjectStoreResourceController } from '../controller/object-store-resource-controller';

export function ObjectStorePage() {
  const { t } = useTranslation();
  const controller = useObjectStoreResourceController();
  const { state } = controller;

  return (
    <OperationalPage>
      <OperationalPageHeader title={t('objectStore.title')} description={t('objectStore.description')} />
      <OperationalResultRegion>
        {(state.kind === 'missing' ||
          state.kind === 'permission' ||
          state.kind === 'invalid' ||
          state.kind === 'unavailable' ||
          state.kind === 'error') && (
          <OperationalStatePanel
            kind={objectStoreFailureStateKind(state.kind)}
            title={t(objectStoreFailureMessageKey(state.kind))}
            action={<RetryButton onRetry={controller.retry} />}
          />
        )}
        {state.kind === 'loading' && <OperationalStatePanel kind="loading" title={t('objectStore.loading')} />}
        {state.kind === 'ready' && (
          <>
            {state.unconfigured && <OperationalStatePanel kind="empty" title={t('objectStore.missing')} />}
            {!controller.canWrite && <OperationalStatePanel kind="permission" title={t('objectStore.readOnly')} />}
            {state.recovery && (
              <OperationalStatePanel
                kind="unavailable"
                title={t(
                  state.recovery.phase === 'proof' ? 'objectStore.recoveryProof' : 'objectStore.recoveryUncertain'
                )}
                action={
                  state.recovery.phase === 'proof' ? (
                    <RetryButton loading={state.proving} onRetry={controller.retry} />
                  ) : undefined
                }
              />
            )}
            <ObjectStoreEditor
              current={state.current}
              canSubmit={state.canSubmit}
              missingFields={state.missingFields}
              dirty={state.dirty}
              locked={state.locked}
              showValidation={state.showValidation}
              saving={state.saving}
              canWrite={controller.canWrite}
              onUpdate={controller.updateDraft}
              onSubmit={controller.submit}
              onDiscard={controller.discard}
            />
          </>
        )}
      </OperationalResultRegion>
    </OperationalPage>
  );
}

function objectStoreFailureStateKind(
  kind: 'missing' | 'permission' | 'invalid' | 'unavailable' | 'error'
): OperationalStateKind {
  if (kind === 'missing') return 'empty';
  if (kind === 'permission') return 'permission';
  if (kind === 'unavailable') return 'unavailable';
  return 'error';
}

function objectStoreFailureMessageKey(kind: 'missing' | 'permission' | 'invalid' | 'unavailable' | 'error') {
  if (kind === 'missing') return 'objectStore.missing';
  if (kind === 'permission') return 'common.permission.roleRequiredDescription';
  if (kind === 'invalid') return 'objectStore.invalid';
  if (kind === 'unavailable') return 'objectStore.unavailable';
  return 'common.routeError.description';
}

function RetryButton({ loading = false, onRetry }: { loading?: boolean; onRetry: () => Promise<void> }) {
  const { t } = useTranslation();
  return (
    <Button
      size="small"
      loading={loading}
      onClick={() => {
        void onRetry();
      }}
    >
      {t('common.retry')}
    </Button>
  );
}
