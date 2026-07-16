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

import { CopyOutlined } from '@ant-design/icons';
import { Alert, App, Button, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { GuideSnippet } from '../api/instrumentation-contract';
import type { InstrumentationSetupController } from '../hooks/use-instrumentation-setup';
import { StageBody } from './instrumentation-stage-content';
import styles from './instrumentation.module.css';

export function InstrumentationGuide({
  setup,
  onStartDetection
}: { setup: InstrumentationSetupController; onStartDetection: () => void }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const guide = setup.guide;
  if (!guide) {
    return (
      <StageBody stage={4} title={t('instrumentation.stage.install')} description={t('instrumentation.stage.installHelp')}>
        <Alert type="error" showIcon title={t('instrumentation.renderUnavailable')} />
      </StageBody>
    );
  }
  const copy = async (snippet: GuideSnippet) => {
    try {
      await setup.copySnippet(snippet);
      void message.success(t('instrumentation.copySuccess'));
    } catch {
      void message.warning(t(snippet.secretPlaceholders.length > 0 && !setup.token
        ? 'instrumentation.tokenRequired'
        : 'instrumentation.copyFailed'));
    }
  };
  return (
    <StageBody stage={4} title={t('instrumentation.stage.install')} description={t('instrumentation.stage.installHelp')}>
      <div className={styles.componentLine}>
        <div><strong>{guide.component.name}</strong><Typography.Text type="secondary">{guide.component.version ?? t('common.unavailable')}</Typography.Text></div>
        <span><Tag color={guide.component.official ? 'success' : 'error'}>{t('instrumentation.official')}</Tag><Tag>{guide.component.license}</Tag></span>
      </div>
      {!guide.component.official || guide.component.bundledWithHertzBeat ? (
        <Alert type="error" showIcon title={t('instrumentation.componentInvalid')} />
      ) : null}
      <div className={styles.guideSteps}>
        {guide.steps.map((step, index) => (
          <article key={step.id} className={styles.guideStep}>
            <header><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{t(step.titleKey)}</strong><small>{t(step.executionLocationKey)}</small></div></header>
            {step.snippets.map(snippet => {
              const tokenMissing = snippet.secretPlaceholders.length > 0 && !setup.token;
              return (
                <div className={styles.snippet} key={snippet.id}>
                  <div>
                    <span>{snippet.language}</span>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      disabled={tokenMissing}
                      onClick={() => void copy(snippet)}
                    >
                      {t(tokenMissing ? 'instrumentation.tokenRequired' : 'instrumentation.action.copy')}
                    </Button>
                  </div>
                  <pre><code>{snippet.content}</code></pre>
                </div>
              );
            })}
          </article>
        ))}
      </div>
      {!setup.token && <Alert type="warning" showIcon title={t('instrumentation.tokenCopyNotice')} />}
      <div className={styles.stageActions}>
        <Button onClick={() => setup.setStage(3)}>{t('instrumentation.action.reviewContext')}</Button>
        <Button type="primary" onClick={onStartDetection}>{t('instrumentation.action.startDetection')}</Button>
      </div>
    </StageBody>
  );
}
