/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { serviceConfigurationReady } from '../model/instrumentation-guided-flow';
import { InstrumentationPlatformField } from './instrumentation-configuration-fields';
import styles from './instrumentation-configure.module.css';
import type { ConfigureStepProps } from './instrumentation-configure-step-props';
import { InstrumentationDestinationSelector } from './instrumentation-destination-selector';
import { InstrumentationGuideConfiguration, InstrumentationTokenModal } from './instrumentation-guide-configuration';
import { InstrumentationServiceIdentityFields } from './instrumentation-service-identity-fields';

export function InstrumentationConfigureStep(props: ConfigureStepProps) {
  const { t } = useTranslation();
  const headingKey = `instrumentation.v2.guided.${props.phase}Title`;
  const descriptionKey = `instrumentation.v2.guided.${props.phase}Description`;
  return (
    <section className={styles.section} aria-labelledby="instrumentation-configure-title">
      <div className={styles.configureIntro}>
        <Typography.Title id="instrumentation-configure-title" level={3}>
          {t(headingKey)}
        </Typography.Title>
        <Typography.Text type="secondary">{t(descriptionKey)}</Typography.Text>
      </div>
      {props.phase === 'destination' && props.profiles.status !== 'available' && (
        <Alert
          type={props.profiles.status === 'unavailable' ? 'error' : 'warning'}
          showIcon
          message={t(`instrumentation.v2.profile.${props.profiles.status}`)}
        />
      )}
      {props.phase === 'service' && <ServiceStep {...props} />}
      {props.phase === 'destination' && <DestinationStep {...props} />}
      {props.phase === 'guide' && <InstrumentationGuideConfiguration {...props} />}
      <InstrumentationTokenModal {...props} />
    </section>
  );
}

function ServiceStep(props: ConfigureStepProps) {
  const { t } = useTranslation();
  const ready = serviceConfigurationReady(props.service, props.platform, props.platformOptions);
  return (
    <>
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
      <StepActions onPrevious={props.onPrevious}>
        <Button type="primary" disabled={!ready} onClick={props.onNext}>
          {t('instrumentation.action.next')}
        </Button>
      </StepActions>
    </>
  );
}

function DestinationStep(props: ConfigureStepProps) {
  const { t } = useTranslation();
  const available = props.profiles.profiles.some(
    profile => profile.id === props.profileId && profile.availability === 'available'
  );
  return (
    <>
      <InstrumentationDestinationSelector
        profiles={props.profiles}
        profileId={props.profileId}
        onProfile={props.onProfile}
      />
      <StepActions onPrevious={props.onPrevious}>
        <Button type="primary" disabled={!available} onClick={props.onNext}>
          {t('instrumentation.action.next')}
        </Button>
      </StepActions>
    </>
  );
}

function StepActions(props: { onPrevious: () => void; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className={styles.configureActions}>
      <Button onClick={props.onPrevious}>{t('instrumentation.action.previous')}</Button>
      {props.children}
    </div>
  );
}
