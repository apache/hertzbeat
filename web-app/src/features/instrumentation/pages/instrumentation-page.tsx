/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Alert, Button, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { applicationRoutePaths } from '@/shared/navigation/app-paths';
import { InstrumentationConfigureStep } from '../components/instrumentation-configure-step';
import { InstrumentationGuideWorkspace } from '../components/instrumentation-guide-workspace';
import { InstrumentationProgress } from '../components/instrumentation-progress';
import { InstrumentationSourceStep } from '../components/instrumentation-source-step';
import styles from '../components/instrumentation-onboarding.module.css';
import { useInstrumentationPageController } from '../controller/use-instrumentation-page-controller';

export function InstrumentationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const page = useInstrumentationPageController();
  return (
    <div className={styles.page}>
      <header className={styles.onboardingHeader}>
        <Button
          className={styles.backAction!}
          type="text"
          icon={<ArrowLeftOutlined aria-hidden="true" />}
          onClick={() => (page.hasFlowBack ? page.goBack() : void navigate(applicationRoutePaths.dashboard))}
        >
          {t(page.hasFlowBack ? 'common.back' : 'instrumentation.action.exit')}
        </Button>
        <div className={styles.brand}>
          <img src="/assets/logo.svg" alt="HertzBeat" width={24} height={23} />
          <strong>HertzBeat</strong>
        </div>
        <Button className={styles.startOver!} onClick={page.reset}>
          {t('instrumentation.v2.startOver')}
        </Button>
      </header>
      <div className={styles.progressBand}>
        <InstrumentationProgress stage={page.stage} />
      </div>
      <main className={styles.onboardingContent}>
        {(page.catalogState === 'loading' || page.profilesState === 'loading') && <Skeleton active />}
        {(page.catalogState === 'error' || page.profilesState === 'error') && (
          <Alert type="error" showIcon message={t('instrumentation.v2.loadError')} />
        )}
        <InstrumentationStageContent page={page} />
      </main>
    </div>
  );
}

type PageController = ReturnType<typeof useInstrumentationPageController>;

function InstrumentationStageContent({ page }: { page: PageController }) {
  if (page.stage === 'source') return <SourceStage page={page} />;
  return <ConfigureStage page={page} />;
}

function SourceStage({ page }: { page: PageController }) {
  const { t } = useTranslation();
  if (!page.catalog) return null;
  return (
    <div className={styles.sourceStage}>
      <InstrumentationSourceStep
        key={page.sourceDirectoryRevision}
        catalog={page.catalog}
        {...(page.draft.sourceId ? { sourceId: page.draft.sourceId } : {})}
        {...(page.draft.recipeId ? { recipeId: page.draft.recipeId } : {})}
        {...(page.draft.framework ? { framework: page.draft.framework } : {})}
        {...(page.draft.method ? { method: page.draft.method } : {})}
        {...(page.draft.environment ? { environment: page.draft.environment } : {})}
        {...(page.draft.platform ? { platform: page.draft.platform } : {})}
        onSource={page.chooseSource}
        onApplicationAnswer={page.answerApplication}
      />
      <Button
        className={styles.sourceContinue!}
        type="primary"
        disabled={!page.canContinueSource}
        onClick={() => page.setStage('configure')}
      >
        {t('instrumentation.action.continue')}
      </Button>
    </div>
  );
}

function ConfigureStage({ page }: { page: PageController }) {
  if (!page.profiles || !page.catalog) return null;
  return (
    <>
      <InstrumentationConfigureStep
        profiles={page.profiles}
        profileId={page.draft.intakeProfileId}
        service={page.draft.service}
        platform={page.draft.platform}
        platformOptions={page.platformOptions}
        canRender={page.canRender}
        rendering={page.rendering}
        renderError={page.renderError}
        token={page.token}
        tokenDraft={page.tokenDraft}
        tokenGenerating={page.tokenGenerating}
        tokenError={page.tokenError}
        requiresToken={page.requiresToken}
        canGenerateToken={page.canGenerateToken}
        onProfile={intakeProfileId => page.patchDraft({ intakeProfileId })}
        onService={page.patchService}
        onPlatform={platform => page.patchDraft({ platform })}
        onToken={page.setToken}
        onRender={() => void page.renderGuide()}
        onOpenToken={page.openTokenGenerator}
        onCloseToken={page.closeTokenGenerator}
        onTokenDraft={page.updateTokenDraft}
        onGenerateToken={() => void page.generateToken()}
      />
      {page.guide && (
        <InstrumentationGuideWorkspace
          catalog={page.catalog}
          draft={page.draft}
          guide={page.guide}
          token={page.token}
          onCopy={page.copyBlock}
          detecting={page.detecting}
          detectionError={page.detectionError}
          {...(page.detection ? { detection: page.detection } : {})}
          onEdit={page.goBack}
          onDetect={() => void page.detect()}
          onOpen={page.openQuery}
        />
      )}
    </>
  );
}
