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

import { Alert, Button, Empty, Input, Select, Skeleton, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  compatibleMethods,
  availableEnvironments,
  availablePlatforms,
  validateFlowContext,
  type FlowStage
} from './instrumentation-flow-model';
import type { InstrumentationSetupController } from './use-instrumentation-setup';
import styles from './instrumentation-page.module.css';

export function SelectionStage({ setup }: { setup: InstrumentationSetupController }) {
  const { t } = useTranslation();
  if (setup.catalogPending) return <Skeleton active paragraph={{ rows: 5 }} />;
  if (setup.catalogError || !setup.catalog) {
    return <ResourceError title={t('instrumentation.catalogUnavailable')} onRetry={() => void setup.retryCatalog()} />;
  }
  if (setup.catalog.languages.length === 0) return <Empty description={t('instrumentation.catalogEmpty')} />;

  if (setup.stage === 1) {
    const environments = availableEnvironments(setup.catalog);
    const platforms = availablePlatforms(setup.catalog, setup.draft.environment);
    return (
      <StageBody stage={1} title={t('instrumentation.stage.environment')} description={t('instrumentation.stage.environmentHelp')}>
        <div className={styles.formGrid}>
          <Field label={t('instrumentation.field.deploymentEnvironment')}>
            <Select
              value={setup.draft.environment}
              options={environments.map(value => ({ value, label: t(`instrumentation.environment.${value}`) }))}
              onChange={setup.setEnvironment}
            />
          </Field>
          <Field label={t('instrumentation.field.platform')}>
            <Select
              value={setup.draft.platform}
              options={platforms.map(value => ({ value, label: t(`instrumentation.platform.${value}`) }))}
              onChange={setup.setPlatform}
            />
          </Field>
        </div>
        <StageActions onContinue={() => setup.setStage(2)} />
      </StageBody>
    );
  }

  if (setup.stage === 2) return <LanguageStage setup={setup} />;
  return <ContextStage setup={setup} />;
}

function LanguageStage({ setup }: { setup: InstrumentationSetupController }) {
  const { t } = useTranslation();
  const { catalog, draft } = setup;
  if (!catalog) return null;
  const selectedLanguage = catalog.languages.find(item => item.language === draft.selection?.language);
  const selectedFramework = selectedLanguage?.frameworks.find(item => item.framework === draft.selection?.framework);
  const languages = catalog.languages.filter(language => language.frameworks.some(framework =>
    compatibleMethods(catalog, draft, language.language, framework.framework).length > 0));
  const frameworks = selectedLanguage?.frameworks.filter(framework =>
    compatibleMethods(catalog, draft, selectedLanguage.language, framework.framework).length > 0) ?? [];
  const methods = draft.selection
    ? compatibleMethods(catalog, draft, draft.selection.language, draft.selection.framework)
    : [];
  return (
    <StageBody stage={2} title={t('instrumentation.stage.language')} description={t('instrumentation.stage.languageHelp')}>
      <div className={styles.formGrid}>
        <Field label={t('instrumentation.field.language')}>
          <Select
            value={draft.selection?.language ?? null}
            placeholder={t('instrumentation.field.languagePlaceholder')}
            options={languages.map(item => ({ value: item.language, label: t(item.labelKey) }))}
            onChange={setup.setLanguage}
          />
        </Field>
        <Field label={t('instrumentation.field.framework')}>
          <Select
            value={draft.selection?.framework ?? null}
            disabled={!selectedLanguage}
            placeholder={t('instrumentation.field.frameworkPlaceholder')}
            options={frameworks.map(item => ({ value: item.framework, label: t(item.labelKey) }))}
            onChange={setup.setFramework}
          />
        </Field>
      </div>
      {selectedFramework && methods.length === 0 && (
        <Alert type="warning" showIcon title={t('instrumentation.methodUnavailable')} />
      )}
      <div className={styles.methodList}>
        {methods.map(method => (
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
      <StageActions disabled={!draft.selection} onBack={() => setup.setStage(1)} onContinue={() => setup.setStage(3)} />
    </StageBody>
  );
}

function ContextStage({ setup }: { setup: InstrumentationSetupController }) {
  const { t } = useTranslation();
  const missing = validateFlowContext(setup.draft);
  const collector = setup.collectors.find(item => item.collectorId === setup.draft.collectorId);
  const handleRender = async () => {
    try {
      await setup.renderGuide();
    } catch {
      // The mutation state renders a localized error without logging request or secret data.
    }
  };
  return (
    <StageBody stage={3} title={t('instrumentation.stage.context')} description={t('instrumentation.stage.contextHelp')}>
      {setup.collectorsPending && <Skeleton active paragraph={{ rows: 2 }} />}
      {setup.collectorsError && (
        <ResourceError title={t('instrumentation.collectorUnavailable')} onRetry={() => void setup.retryCollectors()} />
      )}
      {!setup.collectorsPending && !setup.collectorsError && setup.collectors.length === 0 && (
        <Empty description={t('instrumentation.collectorEmpty')} />
      )}
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
          <Input value={setup.draft.serviceName} onChange={event => setup.setContext('serviceName', event.target.value)} />
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
      {collector && !collector.online && <Alert type="warning" showIcon title={t('instrumentation.collectorOffline')} />}
      {setup.guideError && <Alert type="error" showIcon title={t('instrumentation.renderUnavailable')} />}
      <StageActions
        disabled={missing.length > 0 || !collector?.online}
        loading={setup.guidePending}
        continueLabel={t('instrumentation.action.render')}
        onBack={() => setup.setStage(2)}
        onContinue={() => void handleRender()}
      />
    </StageBody>
  );
}

export function StageBody({
  stage, title, description, children
}: { stage: FlowStage; title: string; description: string; children: ReactNode }) {
  return (
    <section className={styles.stageBody}>
      <header className={styles.stageHeader}>
        <span>{stage}</span><div><Typography.Title level={4}>{title}</Typography.Title><Typography.Text type="secondary">{description}</Typography.Text></div>
      </header>
      <div className={styles.stageContent}>{children}</div>
    </section>
  );
}

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={wide ? styles.fieldWide : styles.field}>
      <span className={styles.fieldLabel}>{label}{hint && <small>{hint}</small>}</span>
      {children}
    </label>
  );
}

function StageActions({
  disabled, loading, continueLabel, onBack, onContinue
}: { disabled?: boolean; loading?: boolean; continueLabel?: string; onBack?: () => void; onContinue: () => void }) {
  const { t } = useTranslation();
  return (
    <div className={styles.stageActions}>
      {onBack && <Button onClick={onBack}>{t('common.back')}</Button>}
      <Button type="primary" disabled={disabled ?? false} loading={loading ?? false} onClick={onContinue}>
        {continueLabel ?? t('instrumentation.action.continue')}
      </Button>
    </div>
  );
}

function ResourceError({ title, onRetry }: { title: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return <Alert type="error" showIcon title={title} action={<Button size="small" onClick={onRetry}>{t('common.retry')}</Button>} />;
}

function capabilityColor(capability: string) {
  if (capability === 'supported') return 'success';
  if (capability === 'preview') return 'warning';
  return 'default';
}
