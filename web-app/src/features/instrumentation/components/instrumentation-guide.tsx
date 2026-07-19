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

import { Alert, App } from 'antd';
import { useTranslation } from 'react-i18next';

import type { InstrumentationSetupController } from '../controller/use-instrumentation-page-controller';
import {
  InstrumentationComponentSummary,
  InstrumentationGuideActions,
  InstrumentationGuideSteps
} from './instrumentation-guide-presentation';
import { StageBody } from './instrumentation-stage';

type GuideSnippet = NonNullable<InstrumentationSetupController['guide']>['steps'][number]['snippets'][number];

interface InstrumentationGuideProps {
  setup: InstrumentationSetupController;
  onStartDetection: () => void;
}

export function InstrumentationGuide({ setup, onStartDetection }: InstrumentationGuideProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const guide = setup.guide;
  if (!guide) {
    return (
      <StageBody
        stage={4}
        title={t('instrumentation.stage.install')}
        description={t('instrumentation.stage.installHelp')}
      >
        <Alert type="error" showIcon message={t('instrumentation.renderUnavailable')} />
      </StageBody>
    );
  }
  const tokenAvailable = Boolean(setup.token);
  const copy = async (snippet: GuideSnippet) => {
    try {
      await setup.copySnippet(snippet);
      void message.success(t('instrumentation.copySuccess'));
    } catch {
      // A Token may be cleared while the clipboard write is pending; only a secret snippet needs Token guidance.
      const tokenRequired = snippet.secretPlaceholders.length > 0 && !setup.token;
      void message.warning(t(tokenRequired ? 'instrumentation.tokenRequired' : 'instrumentation.copyFailed'));
    }
  };
  return (
    <StageBody
      stage={4}
      title={t('instrumentation.stage.install')}
      description={t('instrumentation.stage.installHelp')}
    >
      <InstrumentationComponentSummary component={guide.component} />
      <InstrumentationGuideSteps steps={guide.steps} tokenAvailable={tokenAvailable} onCopy={copy} />
      {!tokenAvailable && <Alert type="warning" showIcon message={t('instrumentation.tokenCopyNotice')} />}
      <InstrumentationGuideActions onBack={() => setup.setStage(3)} onStartDetection={onStartDetection} />
    </StageBody>
  );
}
