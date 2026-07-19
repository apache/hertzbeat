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
import { Alert, Button, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { InstrumentationSetupController } from '../controller/use-instrumentation-page-controller';
import styles from './instrumentation-guide.module.css';
import stageStyles from './instrumentation-stage.module.css';

type Guide = NonNullable<InstrumentationSetupController['guide']>;
type GuideSnippet = Guide['steps'][number]['snippets'][number];

interface InstrumentationComponentSummaryProps {
  component: Guide['component'];
}

interface InstrumentationGuideStepsProps {
  steps: Guide['steps'];
  tokenAvailable: boolean;
  onCopy: (snippet: GuideSnippet) => Promise<void>;
}

interface InstrumentationSnippetProps {
  snippet: GuideSnippet;
  tokenAvailable: boolean;
  onCopy: (snippet: GuideSnippet) => Promise<void>;
}

interface InstrumentationGuideActionsProps {
  onBack: () => void;
  onStartDetection: () => void;
}

export function InstrumentationComponentSummary({ component }: InstrumentationComponentSummaryProps) {
  const { t } = useTranslation();
  const invalid = !component.official || component.bundledWithHertzBeat;

  return (
    <>
      <div className={styles.componentLine}>
        <div>
          <strong>{component.name}</strong>
          <Typography.Text type="secondary">{component.version ?? t('common.unavailable')}</Typography.Text>
        </div>
        <span>
          <Tag color={component.official ? 'success' : 'error'}>{t('instrumentation.official')}</Tag>
          <Tag>{component.license}</Tag>
        </span>
      </div>
      {invalid && <Alert type="error" showIcon message={t('instrumentation.componentInvalid')} />}
    </>
  );
}

export function InstrumentationGuideSteps({ steps, tokenAvailable, onCopy }: InstrumentationGuideStepsProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.guideSteps}>
      {steps.map((step, index) => (
        <article key={step.id} className={styles.guideStep}>
          <header>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <strong>{t(step.titleKey)}</strong>
              <small>{t(step.executionLocationKey)}</small>
            </div>
          </header>
          {step.snippets.map(snippet => (
            <InstrumentationSnippet
              key={snippet.id}
              snippet={snippet}
              tokenAvailable={tokenAvailable}
              onCopy={onCopy}
            />
          ))}
        </article>
      ))}
    </div>
  );
}

function InstrumentationSnippet({ snippet, tokenAvailable, onCopy }: InstrumentationSnippetProps) {
  const { t } = useTranslation();
  const tokenMissing = snippet.secretPlaceholders.length > 0 && !tokenAvailable;

  return (
    <div className={styles.snippet}>
      <div>
        <span>{snippet.language}</span>
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          disabled={tokenMissing}
          onClick={() => void onCopy(snippet)}
        >
          {t(tokenMissing ? 'instrumentation.tokenRequired' : 'instrumentation.action.copy')}
        </Button>
      </div>
      <pre>
        <code>{snippet.content}</code>
      </pre>
    </div>
  );
}

export function InstrumentationGuideActions({ onBack, onStartDetection }: InstrumentationGuideActionsProps) {
  const { t } = useTranslation();

  return (
    <div className={stageStyles.stageActions}>
      <Button onClick={onBack}>{t('instrumentation.action.reviewContext')}</Button>
      <Button type="primary" onClick={onStartDetection}>
        {t('instrumentation.action.startDetection')}
      </Button>
    </div>
  );
}
