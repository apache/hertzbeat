/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AccessTokenGenerationDraft } from '@/shared/access-token/access-token-generation-model';

import { profileUsesPlaintext } from '../model/intake-profile';
import type { IntakeProfilesResponse, ServiceIdentity } from '../model/instrumentation-v2-contract';
import { InstrumentationAccessTokenModal } from './instrumentation-access-token-modal';
import { InstrumentationPlatformField, InstrumentationTokenField } from './instrumentation-configuration-fields';
import styles from './instrumentation-configure.module.css';
import { InstrumentationDestinationCards } from './instrumentation-destination-cards';
import { InstrumentationServiceIdentityFields } from './instrumentation-service-identity-fields';

type ConfigureStepProps = {
  profiles: IntakeProfilesResponse;
  profileId: string;
  service: ServiceIdentity;
  platform?: string | undefined;
  platformOptions: string[];
  canRender: boolean;
  rendering: boolean;
  renderError: boolean;
  token: string;
  tokenDraft?: AccessTokenGenerationDraft | undefined;
  tokenGenerating: boolean;
  tokenError: boolean;
  requiresToken: boolean;
  canGenerateToken: boolean;
  onProfile: (intakeProfileId: string) => void;
  onService: (patch: Partial<ServiceIdentity>) => void;
  onPlatform: (platform: string) => void;
  onToken: (token: string) => void;
  onRender: () => void;
  onOpenToken: () => void;
  onCloseToken: () => void;
  onTokenDraft: (draft: AccessTokenGenerationDraft) => void;
  onGenerateToken: () => void;
};

export function InstrumentationConfigureStep(props: ConfigureStepProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.section} aria-labelledby="instrumentation-configure-title">
      <div className={styles.configureIntro}>
        <Typography.Title id="instrumentation-configure-title" level={3}>
          {t('instrumentation.v2.configureTitle')}
        </Typography.Title>
        <Typography.Text type="secondary">{t('instrumentation.v2.configureDescription')}</Typography.Text>
      </div>
      {props.profiles.status !== 'available' && (
        <Alert
          type={props.profiles.status === 'unavailable' ? 'error' : 'warning'}
          showIcon
          message={t(`instrumentation.v2.profile.${props.profiles.status}`)}
        />
      )}
      <div className={styles.configureWorkspace}>
        <div className={styles.configurePrimary}>
          <section className={styles.configureGroup} aria-labelledby="instrumentation-service-context-title">
            <Typography.Title id="instrumentation-service-context-title" level={5}>
              {t('instrumentation.v2.serviceContext')}
            </Typography.Title>
            <InstrumentationServiceIdentityFields service={props.service} onService={props.onService} />
            <InstrumentationPlatformField
              platform={props.platform}
              options={props.platformOptions}
              onPlatform={props.onPlatform}
            />
          </section>
          <TokenConfiguration {...props} />
        </div>
        <InstrumentationDestinationCards
          profiles={props.profiles}
          profileId={props.profileId}
          onProfile={props.onProfile}
        />
      </div>
      <div className={styles.configureActions}>
        <TokenActions {...props} />
        <Button type="primary" disabled={!props.canRender} loading={props.rendering} onClick={props.onRender}>
          {t('instrumentation.action.render')}
        </Button>
      </div>
      {props.renderError && <Alert type="error" showIcon message={t('instrumentation.v2.renderError')} />}
      <TokenModal {...props} />
    </section>
  );
}

function TokenConfiguration(props: ConfigureStepProps) {
  const { t } = useTranslation();
  if (!props.requiresToken) return null;
  return (
    <>
      {selectedProfileUsesPlaintext(props.profiles, props.profileId) && (
        <Alert type="warning" showIcon message={t('instrumentation.token.plaintextBearerWarning')} />
      )}
      <InstrumentationTokenField token={props.token} onToken={props.onToken} />
    </>
  );
}

function TokenActions(props: ConfigureStepProps) {
  const { t } = useTranslation();
  if (!props.requiresToken) return null;
  return (
    <>
      {props.canGenerateToken && (
        <Button onClick={props.onOpenToken}>{t('instrumentation.token.generateAccess')}</Button>
      )}
      <Typography.Text type={props.token ? 'success' : 'secondary'}>
        {t(props.token ? 'instrumentation.token.ready' : 'instrumentation.token.notGenerated')}
      </Typography.Text>
    </>
  );
}

function TokenModal(props: ConfigureStepProps) {
  if (!props.canGenerateToken || !props.tokenDraft) return null;
  return (
    <InstrumentationAccessTokenModal
      draft={props.tokenDraft}
      tokenGenerating={props.tokenGenerating}
      tokenError={props.tokenError}
      onClose={props.onCloseToken}
      onDraft={props.onTokenDraft}
      onGenerate={props.onGenerateToken}
    />
  );
}

function selectedProfileUsesPlaintext(profiles: IntakeProfilesResponse, profileId: string) {
  const profile = profiles.profiles.find(item => item.id === profileId);
  return profileUsesPlaintext(profile);
}
