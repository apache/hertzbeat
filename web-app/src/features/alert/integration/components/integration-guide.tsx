/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { Alert, Button, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useEffect, useState, type ReactNode } from 'react';

import type {
  AlertIntegrationGuide as AlertIntegrationGuideModel,
  AlertIntegrationVerification
} from '../model/alert-integration-model';
import styles from './integration.module.css';

type GuideProps = {
  guide: AlertIntegrationGuideModel;
  endpoint: string;
  ingressPath: string;
  publicBaseUrlConfigured: boolean;
  requestHeaders: string;
  tokenSettingsPath: string;
  canManageTokens: boolean;
  verification: AlertIntegrationVerification;
  verificationStarting: boolean;
  verificationError: boolean;
  locale: string;
  t: TFunction;
  onOpenTokenSettings: () => void;
  onStartVerification: () => void;
};

type TokenActionProps = Pick<GuideProps, 'tokenSettingsPath' | 't' | 'onOpenTokenSettings'>;

export function IntegrationGuide(props: GuideProps) {
  const blocked = props.guide.readiness === 'guide_blocked';
  const stepCopy = workspaceStepCopy(props.guide);
  return (
    <article className={styles.guide}>
      <header className={styles.guideHeader}>
        <div>
          <Typography.Title level={2}>{props.t(props.guide.displayNameKey)}</Typography.Title>
          <Typography.Paragraph className={styles.guideIntro!}>
            {props.t('alertIntegrations.description')}
          </Typography.Paragraph>
        </div>
      </header>
      <ReadinessEvidence guide={props.guide} t={props.t} />
      {!blocked && (
        <div className={styles.workspace}>
          <WorkspaceStep number={1} title={props.t('alertIntegrations.workspace.prepare')}>
            {stepCopy.prepare && <Typography.Paragraph>{props.t(stepCopy.prepare)}</Typography.Paragraph>}
            {props.canManageTokens && (
              <TokenAction
                tokenSettingsPath={props.tokenSettingsPath}
                t={props.t}
                onOpenTokenSettings={props.onOpenTokenSettings}
              />
            )}
            <EvidenceBlock
              title={props.t('alertIntegrations.requestHeaders')}
              value={props.requestHeaders}
              {...props}
            />
          </WorkspaceStep>

          <WorkspaceStep number={2} title={props.t('alertIntegrations.workspace.configure')}>
            {stepCopy.configure && <Typography.Paragraph>{props.t(stepCopy.configure)}</Typography.Paragraph>}
            <EndpointEvidence {...props} />
            <ContractSummary guide={props.guide} t={props.t} />
            <Snippets guide={props.guide} t={props.t} />
          </WorkspaceStep>

          <WorkspaceStep number={3} title={props.t('alertIntegrations.workspace.verify')} last>
            {stepCopy.verify && <Typography.Paragraph>{props.t(stepCopy.verify)}</Typography.Paragraph>}
            <DocumentText title={props.t('alertIntegrations.dataFlow')} value={props.t(props.guide.acknowledgement)} />
            <VerificationEvidence {...props} />
          </WorkspaceStep>
        </div>
      )}
      {blocked && <GuideList title={props.t('alertIntegrations.requiredFields')} values={props.guide.requiredFields} />}
      <GuideList
        title={props.t('alertIntegrations.limitations')}
        values={props.guide.limitations.map(key => props.t(key))}
      />
    </article>
  );
}

function VerificationEvidence(props: GuideProps) {
  const { verification, t } = props;
  const verified = verification.status === 'verified';
  const waiting = verification.status === 'waiting';
  const statusKey = `alertIntegrations.verification.${verification.status}`;
  let evidence = t('alertIntegrations.verification.unverifiedHint');
  if (waiting) {
    evidence = t('alertIntegrations.verification.waitingHint', {
      time: formatVerificationTime(verification.startedAt, props.locale)
    });
  } else if (verified) {
    evidence = t('alertIntegrations.verification.verifiedHint', {
      time: formatVerificationTime(verification.verifiedAt, props.locale)
    });
  }
  return (
    <section className={styles.verification} aria-live="polite">
      <div className={styles.verificationCopy}>
        <span className={verificationDotClass(verification.status)} aria-hidden="true" />
        <div>
          <strong>{t(statusKey)}</strong>
          <p>{evidence}</p>
          {props.verificationError ? (
            <span className={styles.verificationError} role="alert">
              {t('alertIntegrations.verification.startFailed')}
            </span>
          ) : null}
        </div>
      </div>
      <Button
        type={verification.status === 'unverified' ? 'primary' : 'default'}
        size="small"
        loading={props.verificationStarting}
        onClick={props.onStartVerification}
      >
        {t(verificationActionLabel(verification.status, props.verificationStarting))}
      </Button>
    </section>
  );
}

function verificationDotClass(status: AlertIntegrationVerification['status']) {
  if (status === 'verified') return `${styles.verificationDot} ${styles.verificationDotVerified}`;
  if (status === 'waiting') return `${styles.verificationDot} ${styles.verificationDotWaiting}`;
  return styles.verificationDot;
}

function verificationActionLabel(status: AlertIntegrationVerification['status'], starting: boolean) {
  if (starting) return 'alertIntegrations.verification.starting';
  return status === 'unverified' ? 'alertIntegrations.verification.start' : 'alertIntegrations.verification.restart';
}

function formatVerificationTime(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(timestamp);
}

function workspaceStepCopy(guide: AlertIntegrationGuideModel) {
  if (guide.steps.length >= 3) {
    return { prepare: guide.steps[0], configure: guide.steps[1], verify: guide.steps[2] };
  }
  return { prepare: undefined, configure: guide.steps[0], verify: undefined };
}

function WorkspaceStep(props: { number: number; title: string; last?: boolean; children: ReactNode }) {
  return (
    <section className={`${styles.workspaceStep} ${props.last ? styles.workspaceStepLast : ''}`}>
      <div className={styles.stepRail} aria-hidden="true">
        <span className={styles.stepNumber}>{props.number}</span>
      </div>
      <div className={styles.stepContent}>
        <Typography.Title level={3}>{props.title}</Typography.Title>
        {props.children}
      </div>
    </section>
  );
}

function TokenAction(props: TokenActionProps) {
  return (
    <a
      className={styles.tokenAction}
      href={props.tokenSettingsPath}
      onClick={event => {
        event.preventDefault();
        props.onOpenTokenSettings();
      }}
    >
      {props.t('alertIntegrations.generateToken')}
    </a>
  );
}

function ReadinessEvidence({ guide, t }: { guide: AlertIntegrationGuideModel; t: TFunction }) {
  if (guide.readiness === 'ready') return null;
  return (
    <Alert
      className={styles.readiness!}
      type={guide.readiness === 'guide_blocked' ? 'error' : 'warning'}
      showIcon
      message={t(`alertIntegrations.readiness.${guide.readiness}`)}
    />
  );
}

function EndpointEvidence(props: GuideProps) {
  const value = `${props.guide.method} ${props.endpoint}`;
  return (
    <section className={styles.documentSection}>
      <Typography.Title level={4}>{props.t('alertIntegrations.endpoint')}</Typography.Title>
      <div className={styles.codeEvidence}>
        <pre className={styles.endpointLine}>
          <code>
            <strong>{props.guide.method}</strong> <span>{props.endpoint}</span>
          </code>
        </pre>
        <CopyButton value={value} t={props.t} />
      </div>
      <Typography.Paragraph type="secondary">
        {props.t(
          props.publicBaseUrlConfigured
            ? 'alertIntegrations.endpointConfiguredHint'
            : 'alertIntegrations.endpointRelativeHint',
          { path: props.ingressPath }
        )}
      </Typography.Paragraph>
    </section>
  );
}

function ContractSummary({ guide, t }: { guide: AlertIntegrationGuideModel; t: TFunction }) {
  return (
    <div className={styles.contractSummary}>
      <div>
        <span>{t('alertIntegrations.payloadShape')}</span>
        <code className={styles.inlineCode}>{guide.payloadShape}</code>
      </div>
      <div>
        <span>{t('alertIntegrations.requiredFields')}</span>
        <span className={styles.fieldList}>
          {guide.requiredFields.map(field => (
            <code className={styles.inlineCode} key={field}>
              {field}
            </code>
          ))}
        </span>
      </div>
    </div>
  );
}

function EvidenceBlock(props: { title: string; value: string; t: TFunction }) {
  return (
    <section className={styles.documentSection}>
      <Typography.Title level={4}>{props.title}</Typography.Title>
      <div className={styles.codeEvidence}>
        <pre className={styles.codeBlock}>
          <code>{props.value}</code>
        </pre>
        <CopyButton value={props.value} t={props.t} />
      </div>
    </section>
  );
}

function Snippets({ guide, t }: { guide: AlertIntegrationGuideModel; t: TFunction }) {
  if (guide.snippets.length === 0) return null;
  return (
    <section className={styles.documentSection}>
      {guide.snippets.map((snippet, index) => (
        <div className={styles.snippet} key={`${index}-${snippet}`}>
          <Typography.Title level={4}>{snippetTitle(guide.source, index, t)}</Typography.Title>
          <div className={styles.codeEvidence}>
            <pre className={styles.codeBlock}>
              <code>{snippet}</code>
            </pre>
            <CopyButton value={snippet} t={t} />
          </div>
        </div>
      ))}
    </section>
  );
}

function snippetTitle(source: string, index: number, t: TFunction) {
  if (source === 'zabbix') {
    return t(index === 0 ? 'alertIntegrations.zabbix.parameters' : 'alertIntegrations.zabbix.script');
  }
  return t('alertIntegrations.snippets');
}

function CopyButton({ value, t }: { value: string; t: TFunction }) {
  const [outcome, setOutcome] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (outcome === 'idle') return undefined;
    const timeout = window.setTimeout(() => setOutcome('idle'), 1600);
    return () => window.clearTimeout(timeout);
  }, [outcome]);

  let label = t('alertIntegrations.copy');
  if (outcome === 'copied') {
    label = t('alertIntegrations.copied');
  } else if (outcome === 'failed') {
    label = t('alertIntegrations.copyFailed');
  }

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      setOutcome('failed');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setOutcome('copied');
    } catch {
      setOutcome('failed');
    }
  };

  return (
    <>
      {outcome === 'failed' ? (
        <span className={styles.copyFeedback} role="status">
          {label}
        </span>
      ) : null}
      <Button
        className={styles.copyButton!}
        type="text"
        size="small"
        icon={outcome === 'copied' ? <CheckOutlined /> : <CopyOutlined />}
        aria-label={label}
        onClick={() => void handleCopy()}
      />
    </>
  );
}

function GuideList({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <section className={styles.documentSection}>
      <Typography.Title level={3}>{title}</Typography.Title>
      <ul>
        {values.map(value => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </section>
  );
}

function DocumentText(props: { title: string; value: string }) {
  return (
    <section className={styles.documentSection}>
      <Typography.Title level={4}>{props.title}</Typography.Title>
      <Typography.Paragraph>{props.value}</Typography.Paragraph>
    </section>
  );
}
