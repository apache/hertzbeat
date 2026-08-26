/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { InstrumentationConfigureStep } from '../components/instrumentation-configure-step';
import { InstrumentationGuideWorkspace } from '../components/instrumentation-guide-workspace';
import { InstrumentationSourceStep } from '../components/instrumentation-source-step';
import styles from '../components/instrumentation-onboarding.module.css';
import type { useInstrumentationPageController } from '../controller/use-instrumentation-page-controller';
import type { InstrumentationConfigurePhase } from '../model/instrumentation-guided-flow';

type PageController = ReturnType<typeof useInstrumentationPageController>;
type StageProps = {
  page: PageController;
  configurePhase: InstrumentationConfigurePhase;
  onConfigurePhase: (phase: InstrumentationConfigurePhase) => void;
};

export function InstrumentationStageContent(props: StageProps) {
  if (props.page.stage === 'source') return <SourceStage page={props.page} onContinue={props.onConfigurePhase} />;
  if (!props.page.profiles || !props.page.catalog) return null;
  if (props.configurePhase === 'guide' && props.page.guide) return <GuideStage {...props} />;
  return <ConfigureFormStage {...props} />;
}

function SourceStage(props: { page: PageController; onContinue: (phase: InstrumentationConfigurePhase) => void }) {
  const { t } = useTranslation();
  const { page } = props;
  if (!page.catalog) return null;
  return (
    <div className={styles.sourceStage}>
      <InstrumentationSourceStep
        key={page.sourceDirectoryRevision}
        catalog={page.catalog}
        {...sourceSelections(page)}
        onSource={page.chooseSource}
        onApplicationAnswer={page.answerApplication}
      />
      <Button
        className={styles.sourceContinue!}
        type="primary"
        disabled={!page.canContinueSource}
        onClick={() => {
          props.onContinue('service');
          page.setStage('configure');
        }}
      >
        {t('instrumentation.action.continue')}
      </Button>
    </div>
  );
}

function sourceSelections(page: PageController) {
  return {
    ...(page.draft.sourceId ? { sourceId: page.draft.sourceId } : {}),
    ...(page.draft.recipeId ? { recipeId: page.draft.recipeId } : {}),
    ...(page.draft.framework ? { framework: page.draft.framework } : {}),
    ...(page.draft.method ? { method: page.draft.method } : {}),
    ...(page.draft.environment ? { environment: page.draft.environment } : {}),
    ...(page.draft.platform ? { platform: page.draft.platform } : {})
  };
}

function GuideStage({ page, onConfigurePhase }: StageProps) {
  if (!page.catalog || !page.guide) return null;
  return (
    <InstrumentationGuideWorkspace
      catalog={page.catalog}
      draft={page.draft}
      guide={page.guide}
      token={page.token}
      tokenAcknowledgementRequired={page.tokenAcknowledgementRequired}
      onCopy={page.copyBlock}
      detecting={page.detecting}
      detectionError={page.detectionError}
      {...(page.detection ? { detection: page.detection } : {})}
      onEdit={() => onConfigurePhase('service')}
      onDetect={() => void page.detect()}
      onOpen={page.openQuery}
      onAcknowledgeToken={page.acknowledgeGeneratedToken}
    />
  );
}

function ConfigureFormStage({ page, configurePhase, onConfigurePhase }: StageProps) {
  if (!page.profiles) return null;
  const previous = () => {
    if (configurePhase === 'service') page.goBack();
    else onConfigurePhase(configurePhase === 'guide' ? 'destination' : 'service');
  };
  return (
    <InstrumentationConfigureStep
      phase={configurePhase}
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
      tokenAcknowledgementRequired={page.tokenAcknowledgementRequired}
      requiresToken={page.requiresToken}
      canGenerateToken={page.canGenerateToken}
      onProfile={intakeProfileId => page.patchDraft({ intakeProfileId })}
      onService={page.patchService}
      onPlatform={platform => page.patchDraft({ platform })}
      onToken={page.setToken}
      onRender={() => void page.renderGuide()}
      onPrevious={previous}
      onNext={() => onConfigurePhase(configurePhase === 'service' ? 'destination' : 'guide')}
      onOpenToken={page.openTokenGenerator}
      onCloseToken={page.closeTokenGenerator}
      onTokenDraft={page.updateTokenDraft}
      onGenerateToken={() => void page.generateToken()}
      onAcknowledgeToken={page.acknowledgeGeneratedToken}
    />
  );
}
