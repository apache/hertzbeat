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

import { Alert, Empty, Input, Select, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

import type { InstrumentationCollector } from '../model/instrumentation-collector';
import type { FlowContextField, FlowStage, InstrumentationFlowDraft } from '../model/instrumentation-flow';
import { Field, ResourceError, StageActions, StageBody } from './instrumentation-stage';
import styles from './instrumentation-stage.module.css';

type GuideAvailabilityState =
  | { status: 'unavailable'; reason: 'collector_unavailable' | 'collector_intake_unavailable' }
  | { status: 'idle' | 'rendering' | 'ready' | 'error' };

export interface InstrumentationContextSetup {
  draft: InstrumentationFlowDraft;
  collectors: InstrumentationCollector[];
  collectorsPending: boolean;
  collectorsError: boolean;
  retryCollectors: () => Promise<unknown>;
  contextMissing: FlowContextField[];
  guideState: GuideAvailabilityState;
  guidePending: boolean;
  guideError: boolean;
  token: string;
  setToken: (token: string) => void;
  setContext: (field: FlowContextField, value: string) => void;
  setStage: (stage: FlowStage) => void;
  renderGuide: () => Promise<unknown>;
}

export function InstrumentationContextStage({ setup }: { setup: InstrumentationContextSetup }) {
  const { t } = useTranslation();
  const collector = setup.collectors.find(item => item.collectorId === setup.draft.collectorId);
  const intakeUnavailable =
    collector?.online === true &&
    setup.guideState.status === 'unavailable' &&
    setup.guideState.reason === 'collector_intake_unavailable';
  const renderDisabled = setup.contextMissing.length > 0 || !collector?.online || intakeUnavailable;
  const handleRender = async () => {
    try {
      await setup.renderGuide();
    } catch {
      // The controller exposes localized mutation state without logging request or secret data.
    }
  };
  return (
    <StageBody
      stage={3}
      title={t('instrumentation.stage.context')}
      description={t('instrumentation.stage.contextHelp')}
    >
      <CollectorAvailability setup={setup} collector={collector} intakeUnavailable={intakeUnavailable} />
      <InstrumentationContextFields setup={setup} />
      <StageActions
        disabled={renderDisabled}
        loading={setup.guidePending}
        continueLabel={t('instrumentation.action.render')}
        onBack={() => setup.setStage(2)}
        onContinue={() => void handleRender()}
      />
    </StageBody>
  );
}

type ContextFieldsSetup = Pick<
  InstrumentationContextSetup,
  'collectors' | 'draft' | 'setContext' | 'setToken' | 'token'
>;

function InstrumentationContextFields({ setup }: { setup: ContextFieldsSetup }) {
  const { t } = useTranslation();
  return (
    <div className={styles.formGrid}>
      <Field label={t('instrumentation.field.collector')}>
        <Select<string>
          value={setup.draft.collectorId || null}
          placeholder={t('instrumentation.field.collectorPlaceholder')}
          options={setup.collectors.map(item => ({
            value: item.collectorId,
            disabled: !item.online,
            label: `${item.name} · ${item.address} · ${t(item.online ? 'instrumentation.online' : 'instrumentation.offline')}`
          }))}
          onChange={value => setup.setContext('collectorId', value)}
        />
      </Field>
      <Field label={t('instrumentation.field.serviceName')}>
        <Input
          value={setup.draft.serviceName}
          onChange={event => setup.setContext('serviceName', event.target.value)}
        />
      </Field>
      <Field label={t('instrumentation.field.serviceNamespace')}>
        <Input
          value={setup.draft.serviceNamespace}
          onChange={event => setup.setContext('serviceNamespace', event.target.value)}
        />
      </Field>
      <Field label={t('instrumentation.field.serviceEnvironment')}>
        <Input
          value={setup.draft.serviceEnvironment}
          onChange={event => setup.setContext('serviceEnvironment', event.target.value)}
        />
      </Field>
      <Field wide label={t('instrumentation.field.token')} hint={t('instrumentation.field.tokenMemory')}>
        <Input.Password
          value={setup.token}
          autoComplete="off"
          placeholder={t('instrumentation.field.tokenPlaceholder')}
          onChange={event => setup.setToken(event.target.value)}
        />
      </Field>
    </div>
  );
}

function CollectorAvailability({
  setup,
  collector,
  intakeUnavailable
}: {
  setup: InstrumentationContextSetup;
  collector: InstrumentationCollector | undefined;
  intakeUnavailable: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      {setup.collectorsPending && <Skeleton active paragraph={{ rows: 2 }} />}
      {setup.collectorsError && (
        <ResourceError title={t('instrumentation.collectorUnavailable')} onRetry={() => void setup.retryCollectors()} />
      )}
      {!setup.collectorsPending && !setup.collectorsError && setup.collectors.length === 0 && (
        <Empty description={t('instrumentation.collectorEmpty')} />
      )}
      {collector && !collector.online && (
        <Alert type="warning" showIcon message={t('instrumentation.collectorOffline')} />
      )}
      {intakeUnavailable && <Alert type="warning" showIcon message={t('instrumentation.renderUnavailable')} />}
      {setup.guideError && <Alert type="error" showIcon message={t('instrumentation.renderUnavailable')} />}
    </>
  );
}
