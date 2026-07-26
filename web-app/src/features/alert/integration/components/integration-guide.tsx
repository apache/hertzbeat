/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Typography } from 'antd';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import type { AlertIntegrationCopyState, AlertIntegrationSource } from '../model/alert-integration-model';
import styles from './integration.module.css';

export function IntegrationGuide(props: {
  source: AlertIntegrationSource;
  endpoint: string;
  authorizationHeader: string;
  copyState: AlertIntegrationCopyState;
  tokenSettingsPath: string;
  t: TFunction;
  onCopyEndpoint: () => void;
  onCopyAuthorization: () => void;
  onOpenTokenSettings: () => void;
}) {
  return (
    <div className={styles.guide}>
      <EndpointGuideStep {...props} />
      <AuthorizationGuideStep {...props} />
      <SenderGuideStep {...props} />
      <VerificationGuideStep t={props.t} />
    </div>
  );
}

type IntegrationGuideProps = Parameters<typeof IntegrationGuide>[0];

function EndpointGuideStep(props: IntegrationGuideProps) {
  return (
    <GuideStep number={1} title={props.t('alertIntegrations.endpointTitle')}>
      <Typography.Paragraph>{props.t('alertIntegrations.endpointDescription')}</Typography.Paragraph>
      <dl className={styles.facts}>
        <div>
          <dt>{props.t('alertIntegrations.method')}</dt>
          <dd>POST</dd>
        </div>
        <div>
          <dt>{props.t('alertIntegrations.backendSource')}</dt>
          <dd>{props.source.backendSource}</dd>
        </div>
      </dl>
      <ContractBlock
        label={props.t('alertIntegrations.endpoint')}
        value={props.endpoint}
        outcome={copyOutcome(props.copyState, 'endpoint')}
        t={props.t}
        onCopy={props.onCopyEndpoint}
      />
    </GuideStep>
  );
}

function AuthorizationGuideStep(props: IntegrationGuideProps) {
  return (
    <GuideStep number={2} title={props.t('alertIntegrations.authorizationTitle')}>
      <Typography.Paragraph>{props.t('alertIntegrations.authorizationDescription')}</Typography.Paragraph>
      <ContractBlock
        label={props.t('alertIntegrations.authorizationHeader')}
        value={props.authorizationHeader}
        outcome={copyOutcome(props.copyState, 'authorization')}
        t={props.t}
        onCopy={props.onCopyAuthorization}
      />
      <TokenSettingsLink
        href={props.tokenSettingsPath}
        label={props.t('alertIntegrations.manageTokens')}
        onOpen={props.onOpenTokenSettings}
      />
    </GuideStep>
  );
}

function SenderGuideStep(props: IntegrationGuideProps) {
  return (
    <GuideStep number={3} title={props.t('alertIntegrations.senderTitle')}>
      <Typography.Paragraph>
        {props.t('alertIntegrations.senderDescription', { source: props.t(props.source.nameKey) })}
      </Typography.Paragraph>
      <Typography.Paragraph>{props.t(props.source.configurationKey)}</Typography.Paragraph>
      <Alert type="warning" showIcon message={props.t('alertIntegrations.gatewayWarning')} />
    </GuideStep>
  );
}

function VerificationGuideStep({ t }: Pick<IntegrationGuideProps, 't'>) {
  return (
    <GuideStep number={4} title={t('alertIntegrations.verifyTitle')}>
      <Alert type="info" showIcon message={t('alertIntegrations.healthDisclaimer')} />
    </GuideStep>
  );
}

function TokenSettingsLink(props: { href: string; label: string; onOpen: () => void }) {
  return (
    <a
      href={props.href}
      onClick={event => {
        event.preventDefault();
        props.onOpen();
      }}
    >
      {props.label}
    </a>
  );
}

function GuideStep(props: { number: number; title: string; children: ReactNode }) {
  return (
    <section className={styles.step}>
      <header>
        <span>{props.number}</span>
        <Typography.Title level={3}>{props.title}</Typography.Title>
      </header>
      {props.children}
    </section>
  );
}

function ContractBlock(props: {
  label: string;
  value: string;
  outcome: 'copied' | 'failed' | null;
  t: TFunction;
  onCopy: () => void;
}) {
  const copyLabel = readCopyLabel(props);
  return (
    <div className={styles.contract}>
      <Typography.Text type="secondary">{props.label}</Typography.Text>
      <pre>
        <code>{props.value}</code>
      </pre>
      <Button size="small" onClick={props.onCopy} aria-label={`${copyLabel}: ${props.label}`}>
        {copyLabel}
      </Button>
    </div>
  );
}

function readCopyLabel(props: { outcome: 'copied' | 'failed' | null; t: TFunction }) {
  if (props.outcome === 'failed') return props.t('alertIntegrations.copyFailed');
  if (props.outcome === 'copied') return props.t('alertIntegrations.copied');
  return props.t('alertIntegrations.copy');
}

function copyOutcome(state: AlertIntegrationCopyState, target: 'endpoint' | 'authorization') {
  return state?.target === target ? state.outcome : null;
}
