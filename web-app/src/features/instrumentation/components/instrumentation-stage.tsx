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

import { Alert, Button, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { InstrumentationSetupController } from '../controller/use-instrumentation-page-controller';
import styles from './instrumentation-stage.module.css';

type FlowStage = InstrumentationSetupController['stage'];

export function StageBody({
  stage,
  title,
  description,
  children
}: {
  stage: FlowStage;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.stageBody}>
      <header className={styles.stageHeader}>
        <span>{stage}</span>
        <div>
          <Typography.Title level={4}>{title}</Typography.Title>
          <Typography.Text type="secondary">{description}</Typography.Text>
        </div>
      </header>
      <div className={styles.stageContent}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  wide,
  children
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={wide ? styles.fieldWide : styles.field}>
      <span className={styles.fieldLabel}>{label}{hint && <small>{hint}</small>}</span>
      {children}
    </label>
  );
}

export function StageActions({
  disabled,
  loading,
  continueLabel,
  onBack,
  onContinue
}: {
  disabled?: boolean;
  loading?: boolean;
  continueLabel?: string;
  onBack?: () => void;
  onContinue: () => void;
}) {
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

export function ResourceError({ title, onRetry }: { title: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Alert
      type="error"
      showIcon
      message={title}
      action={<Button size="small" onClick={onRetry}>{t('common.retry')}</Button>}
    />
  );
}
