/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  INTAKE_PROFILE_KINDS,
  intakeEndpointEntries,
  profilesForKind,
  type IntakeProfileKind
} from '../model/intake-profile';
import type { IntakeProfile, IntakeProfilesResponse } from '../model/instrumentation-v2-contract';
import styles from './instrumentation-configure.module.css';

export function InstrumentationDestinationSelector(props: {
  profiles: IntakeProfilesResponse;
  profileId: string;
  onProfile: (intakeProfileId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.destinationPanel} aria-labelledby="instrumentation-destination-title">
      <div className={styles.destinationHeading}>
        <Typography.Title id="instrumentation-destination-title" level={5}>
          {t('instrumentation.v2.destination')}
        </Typography.Title>
        <Typography.Text type="secondary">{t('instrumentation.v2.destinationDescription')}</Typography.Text>
      </div>
      <div className={styles.destinationList}>
        {INTAKE_PROFILE_KINDS.flatMap(kind => {
          const profiles = profilesForKind(props.profiles, kind);
          if (!profiles.length) return <MissingDestination key={kind} kind={kind} />;
          return profiles.map(profile => (
            <DestinationOption
              key={profile.id}
              profile={profile}
              selected={props.profileId === profile.id}
              onSelect={props.onProfile}
            />
          ));
        })}
      </div>
    </section>
  );
}

function DestinationOption(props: {
  profile: IntakeProfile;
  selected: boolean;
  onSelect: (profileId: string) => void;
}) {
  const { t } = useTranslation();
  const available = props.profile.availability === 'available';
  return (
    <button
      type="button"
      className={`${styles.destinationOption} ${props.selected ? styles.destinationOptionSelected : ''}`}
      disabled={!available}
      aria-pressed={props.selected}
      onClick={() => props.onSelect(props.profile.id)}
    >
      <DestinationIdentity kind={props.profile.kind} available={available} />
      <DestinationExplanation kind={props.profile.kind} />
      <span className={styles.destinationEndpointList}>
        {intakeEndpointEntries(props.profile).map(([transport, endpoint]) => (
          <span key={transport} className={styles.endpointEvidence}>
            <span>{t(`instrumentation.v2.transport.${transport}`)}</span>
            <Tag color={endpoint.security === 'plaintext' ? 'error' : 'success'}>
              {t(`instrumentation.v2.security.${endpoint.security}`)}
            </Tag>
            <code>{endpoint.url}</code>
          </span>
        ))}
        {!available && <small>{t(profileReasonKey(props.profile.errorCode))}</small>}
      </span>
    </button>
  );
}

function MissingDestination({ kind }: { kind: IntakeProfileKind }) {
  const { t } = useTranslation();
  return (
    <button type="button" className={styles.destinationOption} disabled aria-pressed={false}>
      <DestinationIdentity kind={kind} available={false} />
      <DestinationExplanation kind={kind} />
      <small className={styles.destinationSetupHint}>{t(setupHintKey(kind))}</small>
    </button>
  );
}

function DestinationIdentity(props: { kind: IntakeProfileKind; available: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={styles.destinationIdentity}>
      <strong>{t(`instrumentation.v2.profileKind.${props.kind}`)}</strong>
      <span className={styles.destinationRoute}>{t(`instrumentation.v2.profileRoute.${props.kind}`)}</span>
      <Tag className={styles.destinationAvailability!} color={props.available ? 'success' : 'default'}>
        {t(`instrumentation.v2.profileAvailability.${props.available ? 'available' : 'unavailable'}`)}
      </Tag>
    </span>
  );
}

function DestinationExplanation({ kind }: { kind: IntakeProfileKind }) {
  const { t } = useTranslation();
  return (
    <span className={styles.destinationExplanation}>
      <span>{t(`instrumentation.v2.profilePurpose.${kind}`)}</span>
      <small>{t(`instrumentation.v2.profileOwnership.${kind}`)}</small>
      <small>{t(`instrumentation.v2.profileBoundary.${kind}`)}</small>
    </span>
  );
}

function setupHintKey(kind: IntakeProfileKind) {
  if (kind === 'server') return 'instrumentation.v2.serverSetupHint';
  if (kind === 'hertzbeat_collector') return 'instrumentation.v2.hybridCollectorSetupHint';
  return 'instrumentation.v2.externalCollectorSetupHint';
}

function profileReasonKey(errorCode?: string) {
  if (errorCode === 'intake_profile_not_advertised') return 'instrumentation.v2.profileReason.notAdvertised';
  if (errorCode === 'intake_profile_advertisement_invalid') {
    return 'instrumentation.v2.profileReason.invalidAdvertisement';
  }
  if (errorCode === 'intake_profile_unavailable') {
    return 'instrumentation.v2.profileReason.destinationUnavailable';
  }
  return 'instrumentation.v2.profileReason.unavailable';
}
