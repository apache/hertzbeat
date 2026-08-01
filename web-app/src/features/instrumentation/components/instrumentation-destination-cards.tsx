/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { intakeEndpointEntries } from '../model/intake-profile';
import type { IntakeProfilesResponse } from '../model/instrumentation-v2-contract';
import styles from './instrumentation-configure.module.css';

export function InstrumentationDestinationCards(props: {
  profiles: IntakeProfilesResponse;
  profileId: string;
  onProfile: (intakeProfileId: string) => void;
}) {
  const { t } = useTranslation();
  const hasHybrid = props.profiles.profiles.some(profile => profile.kind === 'hertzbeat_collector');
  return (
    <section className={styles.destinationPanel} aria-labelledby="instrumentation-destination-title">
      <Typography.Title id="instrumentation-destination-title" level={5}>
        {t('instrumentation.v2.destination')}
      </Typography.Title>
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
    </section>
  );
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
