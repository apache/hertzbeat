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

import { Alert, Select, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { InstrumentationSetupController } from '../controller/use-instrumentation-page-controller';
import { Field, StageActions, StageBody } from './instrumentation-stage';
import styles from './instrumentation-stage.module.css';

export function InstrumentationSelectionStage({ setup }: { setup: InstrumentationSetupController }) {
  return setup.stage === 1
    ? <EnvironmentStage setup={setup} />
    : <LanguageStage setup={setup} />;
}

function EnvironmentStage({ setup }: { setup: InstrumentationSetupController }) {
  const { t } = useTranslation();
  return (
    <StageBody stage={1} title={t('instrumentation.stage.environment')} description={t('instrumentation.stage.environmentHelp')}>
      <div className={styles.formGrid}>
        <Field label={t('instrumentation.field.deploymentEnvironment')}>
          <Select
            value={setup.draft.environment}
            options={setup.selectionOptions.environments.map(value => ({
              value,
              label: t(`instrumentation.environment.${value}`)
            }))}
            onChange={setup.setEnvironment}
          />
        </Field>
        <Field label={t('instrumentation.field.platform')}>
          <Select
            value={setup.draft.platform}
            options={setup.selectionOptions.platforms.map(value => ({
              value,
              label: t(`instrumentation.platform.${value}`)
            }))}
            onChange={setup.setPlatform}
          />
        </Field>
      </div>
      <StageActions onContinue={() => setup.setStage(2)} />
    </StageBody>
  );
}

function LanguageStage({ setup }: { setup: InstrumentationSetupController }) {
  const { t } = useTranslation();
  const { draft, selectionOptions } = setup;
  return (
    <StageBody stage={2} title={t('instrumentation.stage.language')} description={t('instrumentation.stage.languageHelp')}>
      <div className={styles.formGrid}>
        <Field label={t('instrumentation.field.language')}>
          <Select
            value={draft.selection?.language ?? null}
            placeholder={t('instrumentation.field.languagePlaceholder')}
            options={selectionOptions.languages.map(item => ({ value: item.language, label: t(item.labelKey) }))}
            onChange={setup.setLanguage}
          />
        </Field>
        <Field label={t('instrumentation.field.framework')}>
          <Select
            value={draft.selection?.framework ?? null}
            disabled={selectionOptions.frameworks.length === 0}
            placeholder={t('instrumentation.field.frameworkPlaceholder')}
            options={selectionOptions.frameworks.map(item => ({ value: item.framework, label: t(item.labelKey) }))}
            onChange={setup.setFramework}
          />
        </Field>
      </div>
      {selectionOptions.frameworkSelected && selectionOptions.methods.length === 0 && (
        <Alert type="warning" showIcon message={t('instrumentation.methodUnavailable')} />
      )}
      <div className={styles.methodList}>
        {selectionOptions.methods.map(method => (
          <button
            type="button"
            key={method.method}
            className={method.method === draft.selection?.method ? styles.methodSelected : styles.method}
            onClick={() => setup.setMethod(method.method)}
          >
            <span className={styles.methodHeading}>
              <strong>{t(method.labelKey)}</strong>
              {method.preview && <Tag color="warning">{t('instrumentation.preview')}</Tag>}
            </span>
            <Typography.Text type="secondary">{method.component.name}</Typography.Text>
            <span className={styles.capabilityRow}>
              {Object.entries(method.signals).map(([signal, capability]) => (
                <Tag key={signal} color={capabilityColor(capability)}>
                  {t(`instrumentation.signal.${signal}`)} · {t(`instrumentation.capability.${capability}`)}
                </Tag>
              ))}
            </span>
          </button>
        ))}
      </div>
      <StageActions
        disabled={!draft.selection}
        onBack={() => setup.setStage(1)}
        onContinue={() => setup.setStage(3)}
      />
    </StageBody>
  );
}

function capabilityColor(capability: string) {
  if (capability === 'supported') return 'success';
  if (capability === 'preview') return 'warning';
  return 'default';
}
