/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { applicationRoutePaths } from '@/shared/navigation/app-paths';
import { InstrumentationInitializationEvidence } from '../components/instrumentation-initialization-evidence';
import { InstrumentationProgress } from '../components/instrumentation-progress';
import styles from '../components/instrumentation-onboarding.module.css';
import { useInstrumentationPageController } from '../controller/use-instrumentation-page-controller';
import type { InstrumentationConfigurePhase } from '../model/instrumentation-guided-flow';
import { InstrumentationStageContent } from './instrumentation-stage-content';

export function InstrumentationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const page = useInstrumentationPageController();
  const [configurePhase, setConfigurePhase] = useState<InstrumentationConfigurePhase>('service');
  const hasLocalBack = page.stage === 'configure' && configurePhase !== 'service';
  const hasBack = page.hasFlowBack || hasLocalBack;
  const goBack = () => {
    if (page.stage !== 'configure' || configurePhase === 'service') {
      page.goBack();
      return;
    }
    setConfigurePhase(configurePhase === 'guide' ? 'destination' : 'service');
  };
  const reset = () => {
    setConfigurePhase('service');
    page.reset();
  };
  return (
    <div className={styles.page}>
      <header className={styles.onboardingHeader}>
        <Button
          className={styles.backAction!}
          type="text"
          icon={<ArrowLeftOutlined aria-hidden="true" />}
          disabled={page.tokenAcknowledgementRequired}
          onClick={() => (hasBack ? goBack() : void navigate(applicationRoutePaths.dashboard))}
        >
          {t(hasBack ? 'common.back' : 'instrumentation.action.exit')}
        </Button>
        <div className={styles.brand}>
          <img src="/assets/logo.svg" alt="HertzBeat" width={24} height={23} />
          <strong>HertzBeat</strong>
        </div>
        <Button className={styles.startOver!} disabled={page.tokenAcknowledgementRequired} onClick={reset}>
          {t('instrumentation.v2.startOver')}
        </Button>
      </header>
      <div className={styles.onboardingBody}>
        <aside className={styles.flowRail} aria-label={t('instrumentation.progress')}>
          <InstrumentationProgress stage={page.stage} configurePhase={configurePhase} />
        </aside>
        <main className={styles.onboardingContent}>
          <InstrumentationInitializationEvidence
            catalogState={page.catalogState}
            profilesState={page.profilesState}
            retrying={page.initializationRetrying}
            onRetry={() => void page.retryInitialization()}
          />
          <InstrumentationStageContent
            page={page}
            configurePhase={configurePhase}
            onConfigurePhase={setConfigurePhase}
          />
        </main>
      </div>
    </div>
  );
}
