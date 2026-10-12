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

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';
import type { InstrumentationMetadataState } from '../model/instrumentation-initialization';

type Props = {
  catalogState: InstrumentationMetadataState;
  profilesState: InstrumentationMetadataState;
  retrying: boolean;
  onRetry: () => void;
};

export function InstrumentationInitializationEvidence(props: Props) {
  if (isBlockingCatalogState(props.catalogState)) return <CatalogInitializationEvidence {...props} />;
  return <ProfilesInitializationEvidence {...props} />;
}

function CatalogInitializationEvidence(props: Props) {
  const { t } = useTranslation();
  if (props.catalogState === 'initial-loading') {
    return <OperationalStatePanel kind="loading" title={t('instrumentation.v2.initialization.catalogLoading')} />;
  }
  if (props.catalogState === 'retrying') {
    return (
      <OperationalStatePanel
        kind="loading"
        title={t('instrumentation.v2.initialization.catalogRetrying')}
        action={<InitializationRetry {...props} />}
      />
    );
  }
  if (props.catalogState === 'error') {
    return (
      <OperationalStatePanel
        kind="unavailable"
        title={t('instrumentation.v2.initialization.catalogUnavailable')}
        description={t('instrumentation.v2.initialization.catalogUnavailableDescription')}
        action={<InitializationRetry {...props} />}
      />
    );
  }
  return null;
}

function ProfilesInitializationEvidence(props: Props) {
  const { t } = useTranslation();
  if (props.profilesState === 'initial-loading') {
    return <Alert type="info" showIcon message={t('instrumentation.v2.initialization.profilesLoading')} />;
  }
  if (props.profilesState === 'retrying') {
    return (
      <Alert
        type="info"
        showIcon
        message={t('instrumentation.v2.initialization.profilesRetrying')}
        action={<InitializationRetry {...props} />}
      />
    );
  }
  if (props.profilesState === 'error') {
    return (
      <Alert
        type="error"
        showIcon
        message={t('instrumentation.v2.initialization.profilesUnavailable')}
        description={t('instrumentation.v2.initialization.profilesUnavailableDescription')}
        action={<InitializationRetry {...props} />}
      />
    );
  }
  if (props.catalogState === 'stale' || props.profilesState === 'stale') {
    return (
      <Alert
        type="warning"
        showIcon
        message={t('instrumentation.v2.initialization.stale')}
        description={t('instrumentation.v2.initialization.staleDescription')}
        action={<InitializationRetry {...props} />}
      />
    );
  }
  return null;
}

function InitializationRetry({ retrying, onRetry }: Pick<Props, 'retrying' | 'onRetry'>) {
  const { t } = useTranslation();
  return (
    <Button aria-label={t('common.retry')} disabled={retrying} loading={retrying} onClick={onRetry}>
      {t('common.retry')}
    </Button>
  );
}

function isBlockingCatalogState(state: InstrumentationMetadataState) {
  return state === 'initial-loading' || state === 'retrying' || state === 'error';
}
