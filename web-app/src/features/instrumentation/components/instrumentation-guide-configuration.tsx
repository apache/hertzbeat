/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { intakeEndpointEntries, profileUsesPlaintext } from '../model/intake-profile';
import { InstrumentationAccessTokenModal } from './instrumentation-access-token-modal';
import { InstrumentationTokenField } from './instrumentation-configuration-fields';
import configureStyles from './instrumentation-configure.module.css';
import type { ConfigureStepProps } from './instrumentation-configure-step-props';
import styles from './instrumentation-guide-configuration.module.css';

export function InstrumentationGuideConfiguration(props: ConfigureStepProps) {
  const { t } = useTranslation();
  const [usingExistingToken, setUsingExistingToken] = useState(!props.canGenerateToken);
  return (
    <>
      <div className={styles.guidePreparation}>
        <SelectedDestination profiles={props.profiles} profileId={props.profileId} />
        <TokenConfiguration
          {...props}
          usingExistingToken={usingExistingToken}
          onUseExistingToken={() => setUsingExistingToken(true)}
          onCancelExistingToken={() => setUsingExistingToken(false)}
        />
      </div>
      <div className={configureStyles.configureActions}>
        <Button onClick={props.onPrevious}>{t('instrumentation.action.previous')}</Button>
        <Button type="primary" disabled={!props.canRender} loading={props.rendering} onClick={props.onRender}>
          {t('instrumentation.action.next')}
        </Button>
      </div>
      {props.renderError && <Alert type="error" showIcon message={t('instrumentation.v2.renderError')} />}
    </>
  );
}

function SelectedDestination(props: Pick<ConfigureStepProps, 'profiles' | 'profileId'>) {
  const { t } = useTranslation();
  const profile = props.profiles.profiles.find(item => item.id === props.profileId);
  if (!profile) return null;
  return (
    <div className={styles.selectedDestinationInline}>
      <span>{t('instrumentation.v2.guided.selectedDestination')}</span>
      <strong>{t(`instrumentation.v2.profileKind.${profile.kind}`)}</strong>
      <small>{t(`instrumentation.v2.profileRoute.${profile.kind}`)}</small>
      <span className={styles.selectedDestinationEndpoints}>
        {intakeEndpointEntries(profile).map(([transport, endpoint]) => (
          <span key={transport}>
            {t(`instrumentation.v2.transport.${transport}`)}
            <Typography.Text type="secondary">{t(`instrumentation.v2.security.${endpoint.security}`)}</Typography.Text>
          </span>
        ))}
      </span>
    </div>
  );
}

function TokenConfiguration(
  props: ConfigureStepProps & {
    usingExistingToken: boolean;
    onUseExistingToken: () => void;
    onCancelExistingToken: () => void;
  }
) {
  const { t } = useTranslation();
  if (!props.requiresToken && !props.tokenAcknowledgementRequired) return null;
  const profile = props.profiles.profiles.find(item => item.id === props.profileId);
  return (
    <div className={styles.tokenSetup}>
      {props.requiresToken && profileUsesPlaintext(profile) && (
        <Alert type="warning" showIcon message={t('instrumentation.token.plaintextBearerWarning')} />
      )}
      {props.requiresToken && <TokenSetupPrompt {...props} />}
      {props.requiresToken && tokenFieldVisible(props) && (
        <InstrumentationTokenField
          token={props.token}
          disabled={props.tokenAcknowledgementRequired}
          onToken={props.onToken}
        />
      )}
      {props.requiresToken && props.usingExistingToken && props.canGenerateToken && !props.token && (
        <Button className={styles.cancelExistingToken!} type="link" onClick={props.onCancelExistingToken}>
          {t('instrumentation.token.cancelExisting')}
        </Button>
      )}
    </div>
  );
}

function TokenSetupPrompt(
  props: Pick<ConfigureStepProps, 'token' | 'canGenerateToken' | 'onOpenToken'> & {
    usingExistingToken: boolean;
    onUseExistingToken: () => void;
  }
) {
  const { t } = useTranslation();
  const copyKey = tokenSetupCopyKey(props);
  const showTokenActions = !props.token && !tokenFieldVisible(props);
  return (
    <div className={styles.tokenSetupPrompt}>
      <span className={styles.tokenSetupCopy}>
        <Typography.Text strong>{t(`instrumentation.token.${copyKey}Title`)}</Typography.Text>
        <Typography.Text type="secondary">{t(`instrumentation.token.${copyKey}Description`)}</Typography.Text>
      </span>
      {showTokenActions && (
        <span className={styles.tokenSetupActions}>
          <Button type="primary" onClick={props.onOpenToken}>
            {t('instrumentation.token.create')}
          </Button>
          <Button type="link" onClick={props.onUseExistingToken}>
            {t('instrumentation.token.useExisting')}
          </Button>
        </span>
      )}
    </div>
  );
}

function tokenSetupCopyKey(props: { token: string; usingExistingToken: boolean; canGenerateToken: boolean }) {
  if (props.token) return 'ready';
  if (props.usingExistingToken || !props.canGenerateToken) return 'existing';
  return 'setup';
}

function tokenFieldVisible(props: { usingExistingToken: boolean; canGenerateToken: boolean }) {
  return props.usingExistingToken || !props.canGenerateToken;
}

export function InstrumentationTokenModal(props: ConfigureStepProps) {
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
