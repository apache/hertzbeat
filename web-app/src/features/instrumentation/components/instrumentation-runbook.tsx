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

export function InstrumentationRunbook({
  setup,
  detection
}: {
  setup: InstrumentationSetupController;
  detection: InstrumentationDetectionController;
}) {
  const { t } = useTranslation();
  const startDetection = () => {
    setup.setStage(5);
    detection.start();
  };
  const selectStage = (stage: (typeof stages)[number]['id']) => {
    if (stage < 5) detection.reset();
    setup.setStage(stage);
  };
  return (
    <>
      <ol className={styles.stageRail} aria-label={t('instrumentation.progress')}>
        {stages.map(stage => {
          const complete = stage.id < setup.stage;
          const active = stage.id === setup.stage;
          return (
            <li key={stage.id} className={active ? styles.stageActive : complete ? styles.stageComplete : styles.stageLocked}>
              <button type="button" disabled={stage.id > setup.stage} onClick={() => selectStage(stage.id)}>
                <span>{complete ? <CheckOutlined /> : stage.id > setup.stage ? <LockOutlined /> : stage.id}</span>
                <strong>{t(`instrumentation.stage.${stage.key}`)}</strong>
              </button>
            </li>
          );
        })}
      </ol>
      <div className={styles.workspaceGrid}>
        <div>
          {setup.stage <= 3 && <InstrumentationStageContent setup={setup} />}
          {setup.stage === 4 && <InstrumentationGuide setup={setup} onStartDetection={startDetection} />}
          {setup.stage === 5 && <InstrumentationDetection detection={detection} />}
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
    ['language', language ? t(language.labelKey) : '—'],
    ['framework', framework ? t(framework.labelKey) : '—'],
    ['method', method ? t(method.labelKey) : '—'],
    ['collector', setup.draft.collectorId || '—'],
    ['serviceName', setup.draft.serviceName || '—'],
    ['serviceNamespace', setup.draft.serviceNamespace || '—'],
    ['serviceEnvironment', setup.draft.serviceEnvironment || '—'],
    ['token', t(setup.token ? 'instrumentation.tokenInMemory' : 'instrumentation.tokenMissing')]
  ];
  return (
    <aside className={styles.scopePanel}>
      <Typography.Text className={styles.scopeTitle ?? ''}>{t('instrumentation.scope')}</Typography.Text>
      <dl>{scope.map(([key, value]) => <div key={key}><dt>{t(`instrumentation.field.${key}`)}</dt><dd>{value}</dd></div>)}</dl>
      {method && (
        <div className={styles.scopeSignals}>
          <Typography.Text type="secondary">{t('instrumentation.signalCapability')}</Typography.Text>
          {Object.entries(method.signals).map(([signal, capability]) => (
            <span key={signal}><b>{t(`instrumentation.signal.${signal}`)}</b><em>{t(`instrumentation.capability.${capability}`)}</em></span>
          ))}
        </div>
      )}
      <Typography.Text type="secondary" className={styles.scopeNote ?? ''}>{t('instrumentation.scopeHelp')}</Typography.Text>
    </aside>
  );
}

function findSelectionMetadata(setup: InstrumentationSetupController) {
  const selection = setup.draft.selection;
  const language = selection ? setup.catalog?.languages.find(item => item.language === selection.language) : undefined;
  const framework = selection ? language?.frameworks.find(item => item.framework === selection.framework) : undefined;
  const method = selection ? framework?.methods.find(item => item.method === selection.method) : undefined;
  return { language, framework, method };
}
