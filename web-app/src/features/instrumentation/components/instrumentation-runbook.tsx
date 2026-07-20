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

import { CheckOutlined, LockOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { InstrumentationDetectionController } from '../controller/use-instrumentation-detection-controller';
import type { InstrumentationSetupController } from '../controller/use-instrumentation-page-controller';
import { InstrumentationDetection } from './instrumentation-detection';
import { InstrumentationGuide } from './instrumentation-guide';
import { InstrumentationStageContent } from './instrumentation-stage-content';
import styles from './instrumentation-shell.module.css';

const stages = [
  { id: 1, key: 'environment' },
  { id: 2, key: 'language' },
  { id: 3, key: 'context' },
  { id: 4, key: 'install' },
  { id: 5, key: 'detect' }
] as const;
const LAST_SETUP_STAGE = 3;
const INSTALLATION_STAGE = 4;
const DETECTION_STAGE = 5;
const MISSING_SCOPE_VALUE = '—';

type RunbookStage = (typeof stages)[number];
type RunbookStageStatus = 'active' | 'complete' | 'locked';

export function InstrumentationRunbook({
  setup,
  detection
}: {
  setup: InstrumentationSetupController;
  detection: InstrumentationDetectionController;
}) {
  const { t } = useTranslation();
  const startDetection = () => {
    setup.setStage(DETECTION_STAGE);
    detection.start();
  };
  const selectStage = (stage: RunbookStage['id']) => {
    // Detection evidence belongs to the completed setup; returning to setup invalidates that evidence.
    if (stage < DETECTION_STAGE) detection.reset();
    setup.setStage(stage);
  };
  return (
    <>
      <ol className={styles.stageRail} aria-label={t('instrumentation.progress')}>
        {stages.map(stage => {
          const status = runbookStageStatus(stage.id, setup.stage);
          let marker = <>{stage.id}</>;
          if (status === 'complete') marker = <CheckOutlined />;
          if (status === 'locked') marker = <LockOutlined />;
          return (
            <li key={stage.id} className={runbookStageClassName(status)}>
              <button type="button" disabled={status === 'locked'} onClick={() => selectStage(stage.id)}>
                <span>{marker}</span>
                <strong>{t(`instrumentation.stage.${stage.key}`)}</strong>
              </button>
            </li>
          );
        })}
      </ol>
      <div className={styles.workspaceGrid}>
        <div>
          {setup.stage <= LAST_SETUP_STAGE && <InstrumentationStageContent setup={setup} />}
          {setup.stage === INSTALLATION_STAGE && (
            <InstrumentationGuide setup={setup} onStartDetection={startDetection} />
          )}
          {setup.stage === DETECTION_STAGE && <InstrumentationDetection detection={detection} />}
        </div>
        <ScopePanel setup={setup} />
      </div>
    </>
  );
}

function ScopePanel({ setup }: { setup: InstrumentationSetupController }) {
  const { t } = useTranslation();
  const { language, framework, method } = findSelectionMetadata(setup);
  const scope = [
    ['deploymentEnvironment', t(`instrumentation.environment.${setup.draft.environment}`)],
    ['platform', t(`instrumentation.platform.${setup.draft.platform}`)],
    ['language', language ? t(language.labelKey) : MISSING_SCOPE_VALUE],
    ['framework', framework ? t(framework.labelKey) : MISSING_SCOPE_VALUE],
    ['method', method ? t(method.labelKey) : MISSING_SCOPE_VALUE],
    ['collector', setup.draft.collectorId || MISSING_SCOPE_VALUE],
    ['serviceName', setup.draft.serviceName || MISSING_SCOPE_VALUE],
    ['serviceNamespace', setup.draft.serviceNamespace || MISSING_SCOPE_VALUE],
    ['serviceEnvironment', setup.draft.serviceEnvironment || MISSING_SCOPE_VALUE],
    ['token', t(setup.token ? 'instrumentation.tokenInMemory' : 'instrumentation.tokenMissing')]
  ];
  return (
    <aside className={styles.scopePanel}>
      <Typography.Text className={styles.scopeTitle ?? ''}>{t('instrumentation.scope')}</Typography.Text>
      <dl>
        {scope.map(([key, value]) => (
          <div key={key}>
            <dt>{t(`instrumentation.field.${key}`)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {method && (
        <div className={styles.scopeSignals}>
          <Typography.Text type="secondary">{t('instrumentation.signalCapability')}</Typography.Text>
          {Object.entries(method.signals).map(([signal, capability]) => (
            <span key={signal}>
              <b>{t(`instrumentation.signal.${signal}`)}</b>
              <em>{t(`instrumentation.capability.${capability}`)}</em>
            </span>
          ))}
        </div>
      )}
      <Typography.Text type="secondary" className={styles.scopeNote ?? ''}>
        {t('instrumentation.scopeHelp')}
      </Typography.Text>
    </aside>
  );
}

function findSelectionMetadata(setup: InstrumentationSetupController) {
  const selection = setup.draft.selection;
  if (!selection) return {};
  const language = setup.catalog?.languages.find(item => item.language === selection.language);
  const framework = language?.frameworks.find(item => item.framework === selection.framework);
  const method = framework?.methods.find(item => item.method === selection.method);
  return { language, framework, method };
}

function runbookStageStatus(stage: RunbookStage['id'], currentStage: InstrumentationSetupController['stage']) {
  if (stage < currentStage) return 'complete';
  if (stage === currentStage) return 'active';
  return 'locked';
}

function runbookStageClassName(status: RunbookStageStatus) {
  if (status === 'active') return styles.stageActive;
  if (status === 'complete') return styles.stageComplete;
  return styles.stageLocked;
}
