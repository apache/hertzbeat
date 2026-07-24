/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Alert, Button, Skeleton, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { InstrumentationContextStep } from '../components/instrumentation-context-step';
import { InstrumentationDetectionPanel } from '../components/instrumentation-detection-panel';
import { InstrumentationGuideBlocks } from '../components/instrumentation-guide-blocks';
import { InstrumentationProgress } from '../components/instrumentation-progress';
import { InstrumentationSourceStep } from '../components/instrumentation-source-step';
import styles from '../components/instrumentation-shell.module.css';
import { useInstrumentationPageController } from '../controller/use-instrumentation-page-controller';

export function InstrumentationPage() {
  const { t } = useTranslation();
  const page = useInstrumentationPageController();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('instrumentation.v2.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('instrumentation.v2.description')}</Typography.Text>
        </div>
        <Button onClick={page.reset}>{t('instrumentation.v2.startOver')}</Button>
      </header>
      <InstrumentationProgress stage={page.stage} onBack={page.goBack} />
      {(page.catalogState === 'loading' || page.profilesState === 'loading') && <Skeleton active />}
      {(page.catalogState === 'error' || page.profilesState === 'error') && (
        <Alert type="error" showIcon message={t('instrumentation.v2.loadError')} />
      )}
      <InstrumentationStageContent page={page} />
    </div>
  );
}

type PageController = ReturnType<typeof useInstrumentationPageController>;

function InstrumentationStageContent({ page }: { page: PageController }) {
  if (page.stage === 'source') return <SourceStage page={page} />;
  if (page.stage === 'context') return <ContextStage page={page} />;
  if (page.stage === 'install') return <InstallStage page={page} />;
  return <DetectStage page={page} />;
}

function SourceStage({ page }: { page: PageController }) {
  const { t } = useTranslation();
  if (!page.catalog) return null;
  return (
    <>
      <InstrumentationSourceStep
        catalog={page.catalog}
        sourceKind={page.draft.sourceKind}
        {...(page.draft.recipeId ? { recipeId: page.draft.recipeId } : {})}
        {...(page.draft.language ? { language: page.draft.language } : {})}
        {...(page.draft.framework ? { framework: page.draft.framework } : {})}
        {...(page.draft.method ? { method: page.draft.method } : {})}
        {...(page.draft.environment ? { environment: page.draft.environment } : {})}
        {...(page.draft.platform ? { platform: page.draft.platform } : {})}
        onSource={page.chooseSource}
        onApplicationAnswer={page.answerApplication}
      />
      <Button type="primary" disabled={!page.canContinueSource} onClick={() => page.setStage('context')}>
        {t('instrumentation.action.continue')}
      </Button>
    </>
  );
}

function ContextStage({ page }: { page: PageController }) {
  if (!page.profiles) return null;
  return (
    <InstrumentationContextStep
      profiles={page.profiles}
      profileId={page.draft.intakeProfileId}
      service={page.draft.service}
      canRender={page.canRender}
      rendering={page.rendering}
      renderError={page.renderError}
      onProfile={intakeProfileId => page.patchDraft({ intakeProfileId })}
      onService={page.patchService}
      onRender={() => void page.renderGuide()}
    />
  );
}

function InstallStage({ page }: { page: PageController }) {
  if (!page.guide) return null;
  return (
    <InstrumentationGuideBlocks
      guide={page.guide}
      token={page.token}
      onToken={page.setToken}
      onCopy={page.copyBlock}
      onDetect={() => {
        page.setStage('detect');
        void page.detect();
      }}
    />
  );
}

function DetectStage({ page }: { page: PageController }) {
  return (
    <Space direction="vertical" className={styles.fullWidth!}>
      <InstrumentationDetectionPanel
        {...(page.detection ? { response: page.detection } : {})}
        detecting={page.detecting}
        error={page.detectionError}
        onRetry={() => void page.detect()}
        onOpen={page.openQuery}
      />
    </Space>
  );
}
