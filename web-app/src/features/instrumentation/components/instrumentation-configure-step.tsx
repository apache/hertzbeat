/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AccessTokenGenerationDraft } from '@/shared/access-token/access-token-generation-model';

import { intakeEndpointEntries, profileUsesPlaintext } from '../model/intake-profile';
import type { IntakeProfilesResponse, ServiceIdentity } from '../model/instrumentation-v2-contract';
import { InstrumentationAccessTokenModal } from './instrumentation-access-token-modal';
import { InstrumentationPlatformField, InstrumentationTokenField } from './instrumentation-configuration-fields';
import styles from './instrumentation-configure.module.css';
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
      <Typography.Title id="instrumentation-configure-title" level={4}>
        {t('instrumentation.v2.configureTitle')}
      </Typography.Title>
      {props.profiles.status !== 'available' && (
        <Alert
          type={props.profiles.status === 'unavailable' ? 'error' : 'warning'}
          showIcon
          message={t(`instrumentation.v2.profile.${props.profiles.status}`)}
        />
      )}
      <InstrumentationServiceIdentityFields service={props.service} onService={props.onService} />
      <InstrumentationPlatformField
        platform={props.platform}
        options={props.platformOptions}
        onPlatform={props.onPlatform}
      />
      <DestinationCards profiles={props.profiles} profileId={props.profileId} onProfile={props.onProfile} />
      {selectedProfileUsesPlaintext(props.profiles, props.profileId) && (
        <Alert type="warning" showIcon message={t('instrumentation.token.plaintextBearerWarning')} />
      )}
      <InstrumentationTokenField token={props.token} onToken={props.onToken} />
      <div className={styles.configureActions}>
        {props.canGenerateToken && (
          <Button onClick={props.onOpenToken}>{t('instrumentation.token.generateAccess')}</Button>
        )}
        <Typography.Text type={props.token ? 'success' : 'secondary'}>
          {t(props.token ? 'instrumentation.token.ready' : 'instrumentation.token.notGenerated')}
        </Typography.Text>
        <Button type="primary" disabled={!props.canRender} loading={props.rendering} onClick={props.onRender}>
          {t('instrumentation.action.render')}
        </Button>
      </div>
      {props.renderError && <Alert type="error" showIcon message={t('instrumentation.v2.renderError')} />}
      {props.canGenerateToken && props.tokenDraft && (
        <InstrumentationAccessTokenModal
          draft={props.tokenDraft}
          tokenGenerating={props.tokenGenerating}
          tokenError={props.tokenError}
          onClose={props.onCloseToken}
          onDraft={props.onTokenDraft}
          onGenerate={props.onGenerateToken}
        />
      )}
    </section>
  );
}

function DestinationCards(props: {
  profiles: IntakeProfilesResponse;
  profileId: string;
  onProfile: (intakeProfileId: string) => void;
}) {
  const { t } = useTranslation();
  const hasHybrid = props.profiles.profiles.some(profile => profile.kind === 'hertzbeat_collector');
  return (
    <div>
      <Typography.Text strong>{t('instrumentation.v2.destination')}</Typography.Text>
      <div className={styles.destinationGrid}>
        {props.profiles.profiles.map(profile => {
          const available = profile.availability === 'available';
          return (
            <button
              key={profile.id}
              type="button"
              className={`${styles.destinationCard} ${
                props.profileId === profile.id ? styles.destinationCardSelected : ''
              }`}
              disabled={!available}
              aria-pressed={props.profileId === profile.id}
              onClick={() => props.onProfile(profile.id)}
            >
              <span>{t(`instrumentation.v2.profileKind.${profile.kind}`)}</span>
              <Tag color={available ? 'success' : 'default'}>
                {t(`instrumentation.v2.profileAvailability.${profile.availability}`)}
              </Tag>
              {intakeEndpointEntries(profile).map(([transport, endpoint]) => (
                <span key={transport} className={styles.endpointEvidence}>
                  <span>{t(`instrumentation.v2.transport.${transport}`)}</span>
                  <Tag color={endpoint.security === 'plaintext' ? 'error' : 'success'}>
                    {t(`instrumentation.v2.security.${endpoint.security}`)}
                  </Tag>
                  <code>{endpoint.url}</code>
                </span>
              ))}
              {!available && <small>{t(profileReasonKey(profile.errorCode))}</small>}
            </button>
          );
        })}
        {!hasHybrid && (
          <div className={`${styles.destinationCard} ${styles.destinationCardUnavailable}`}>
            <span>{t('instrumentation.v2.profileKind.hertzbeat_collector')}</span>
            <Tag>{t('instrumentation.v2.profileAvailability.unavailable')}</Tag>
            <small>{t('instrumentation.v2.hybridCollectorSetupHint')}</small>
          </div>
        )}
      </div>
    </div>
  );
}

function selectedProfileUsesPlaintext(profiles: IntakeProfilesResponse, profileId: string) {
  const profile = profiles.profiles.find(item => item.id === profileId);
  return profileUsesPlaintext(profile);
}

function profileReasonKey(errorCode?: string) {
  if (errorCode === 'intake_profile_not_advertised') {
    return 'instrumentation.v2.profileReason.notAdvertised';
  }
  if (errorCode === 'intake_profile_advertisement_invalid') {
    return 'instrumentation.v2.profileReason.invalidAdvertisement';
  }
  if (errorCode === 'intake_profile_unavailable') {
    return 'instrumentation.v2.profileReason.destinationUnavailable';
  }
  return 'instrumentation.v2.profileReason.unavailable';
}
