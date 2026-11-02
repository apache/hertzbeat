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

import { Button, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProviderConnectionTest } from '../model/agent-provider-test-contract';
import styles from './agent-provider-dialog.module.css';

export function AgentProviderTestControls({
  test,
  start,
  disabled,
  children
}: {
  test: ProviderConnectionTest | undefined;
  start: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const running = test?.state.phase === 'running';
  return (
    <div className={styles.testControls}>
      <Typography.Paragraph type="secondary">{t('aiWorkspace.providers.testHint')}</Typography.Paragraph>
      <div className={styles.formActions}>
        <Button onClick={start} disabled={disabled || !test || running}>
          {t('aiWorkspace.providers.testConnection')}
        </Button>
        {running ? <Button onClick={test.cancel}>{t('aiWorkspace.providers.cancelTest')}</Button> : null}
        {children}
      </div>
      {running ? <p role="status">{t('aiWorkspace.providers.testRunning')}</p> : null}
      {test?.state.phase === 'done' ? (
        <div role="status" aria-live="polite">
          <Typography.Paragraph type={test.state.result.category === 'OK' ? 'success' : 'warning'}>
            {t(`aiWorkspace.providers.testResult.${test.state.result.category}`)}
          </Typography.Paragraph>
          <Typography.Paragraph>
            {t('aiWorkspace.providers.testMetadata', {
              protocol: test.state.result.protocol ?? '—',
              model: test.state.result.model ?? '—',
              elapsed: test.state.result.elapsedMs,
              status: test.state.result.httpStatus ?? '—'
            })}
          </Typography.Paragraph>
        </div>
      ) : null}
    </div>
  );
}
