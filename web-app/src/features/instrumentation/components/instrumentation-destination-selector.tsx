/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { CheckCircleFilled, CopyOutlined } from '@ant-design/icons';
import { Button, Select, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  INTAKE_PROFILE_KINDS,
  intakeEndpointEntries,
  profilesForKind,
  type IntakeProfileKind
} from '../model/intake-profile';
import type { IntakeProfile, IntakeProfilesResponse } from '../model/instrumentation-v2-contract';
import styles from './instrumentation-destination-selector.module.css';

export function InstrumentationDestinationSelector(props: {
  profiles: IntakeProfilesResponse;
  profileId: string;
  onProfile: (intakeProfileId: string) => void;
}) {
  const { t } = useTranslation();
  const selectedProfile = props.profiles.profiles.find(profile => profile.id === props.profileId);
  return (
    <div className={styles.destinationWorkspace}>
      <section className={styles.destinationPanel} aria-label={t('instrumentation.v2.destination')}>
        <div className={styles.destinationList}>
          {INTAKE_PROFILE_KINDS.map(kind => {
            const kindProfiles = profilesForKind(props.profiles, kind);
            if (!kindProfiles.length) return <MissingDestination key={kind} kind={kind} />;
            const profile =
              kindProfiles.find(item => item.id === props.profileId) ??
              kindProfiles.find(item => item.availability === 'available') ??
              kindProfiles[0]!;
            return (
              <DestinationOption
                key={kind}
                profile={profile}
                selected={selectedProfile?.kind === kind}
                onSelect={props.onProfile}
              />
            );
          })}
        </div>
      </section>
      <CurrentIntake profile={selectedProfile} profiles={props.profiles} onProfile={props.onProfile} />
    </div>
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
      <span className={styles.destinationRadio} aria-hidden="true">
        {props.selected && <span />}
      </span>
      <DestinationIdentity kind={props.profile.kind} available={available} />
      <DestinationExplanation kind={props.profile.kind} />
      {!available && <small className={styles.destinationReason}>{t(profileReasonKey(props.profile.errorCode))}</small>}
    </button>
  );
}

function MissingDestination({ kind }: { kind: IntakeProfileKind }) {
  const { t } = useTranslation();
  return (
    <button type="button" className={styles.destinationOption} disabled aria-pressed={false}>
      <span className={styles.destinationRadio} aria-hidden="true" />
      <DestinationIdentity kind={kind} available={false} />
      <DestinationExplanation kind={kind} />
      <small className={styles.destinationReason}>{t(setupHintKey(kind))}</small>
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
    </span>
  );
}

function CurrentIntake(props: {
  profile: IntakeProfile | undefined;
  profiles: IntakeProfilesResponse;
  onProfile: (profileId: string) => void;
}) {
  const { t } = useTranslation();
  const availablePeers = props.profile
    ? profilesForKind(props.profiles, props.profile.kind).filter(item => item.availability === 'available')
    : [];
  return (
    <aside className={styles.currentIntake} aria-label={t('instrumentation.v2.guided.currentIntake')}>
      <Typography.Title level={5}>{t('instrumentation.v2.guided.currentIntake')}</Typography.Title>
      {!props.profile || props.profile.availability !== 'available' ? (
        <Typography.Text type="secondary">{t('instrumentation.v2.guided.selectAvailableDestination')}</Typography.Text>
      ) : (
        <>
          <div className={styles.currentIntakeStatus}>
            <CheckCircleFilled aria-hidden="true" />
            <span>{t('instrumentation.v2.guided.online')}</span>
          </div>
          <strong>{t(`instrumentation.v2.profileKind.${props.profile.kind}`)}</strong>
          {availablePeers.length > 1 && (
            <Select
              aria-label={t('instrumentation.v2.guided.destinationInstance')}
              value={props.profile.id}
              options={availablePeers.map(item => ({ value: item.id, label: item.collectorId ?? item.id }))}
              onChange={props.onProfile}
            />
          )}
          {props.profile.collectorId && (
            <span className={styles.currentIntakeMeta}>
              <span>{t('instrumentation.v2.guided.collectorId')}</span>
              <code>{props.profile.collectorId}</code>
            </span>
          )}
          <EndpointSummary profile={props.profile} />
        </>
      )}
    </aside>
  );
}

function EndpointSummary({ profile }: { profile: IntakeProfile }) {
  const { t } = useTranslation();
  return (
    <dl className={styles.endpointSummary}>
      {intakeEndpointEntries(profile).map(([transport, endpoint]) => (
        <div key={transport}>
          <dt>{t(`instrumentation.v2.transport.${transport}`)}</dt>
          <dd>
            <code>{endpoint.url}</code>
            <Tag color={endpoint.security === 'plaintext' ? 'warning' : 'success'}>
              {t(`instrumentation.v2.security.${endpoint.security}`)}
            </Tag>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined aria-hidden="true" />}
              aria-label={t('instrumentation.v2.guided.copyEndpoint', {
                transport: t(`instrumentation.v2.transport.${transport}`)
              })}
              onClick={() => copyEndpoint(endpoint.url)}
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function copyEndpoint(value: string) {
  void navigator.clipboard?.writeText(value).catch(() => undefined);
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
