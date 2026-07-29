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

import { Alert, Button, Typography } from 'antd';
import type { TFunction } from 'i18next';

import type {
  AlertIntegrationCopyState,
  AlertIntegrationGuide as AlertIntegrationGuideModel
} from '../model/alert-integration-model';
import styles from './integration.module.css';

type GuideProps = {
  guide: AlertIntegrationGuideModel;
  endpoint: string;
  authorizationHeader: string;
  copyState: AlertIntegrationCopyState;
  tokenSettingsPath: string;
  t: TFunction;
  onCopyEndpoint: () => void;
  onCopyAuthorization: () => void;
  onOpenTokenSettings: () => void;
};

export function IntegrationGuide(props: GuideProps) {
  const blocked = props.guide.readiness === 'guide_blocked';
  return (
    <div className={styles.guide}>
      <ReadinessEvidence guide={props.guide} t={props.t} />
      <GuideFacts guide={props.guide} t={props.t} />
      {!blocked && <RunnableContract {...props} />}
      <GuideList title={props.t('alertIntegrations.requiredFields')} values={props.guide.requiredFields} />
      <GuideList title={props.t('alertIntegrations.steps')} values={props.guide.steps.map(key => props.t(key))} />
      {!blocked && <Snippets snippets={props.guide.snippets} t={props.t} />}
      <Alert type="info" showIcon message={props.t(props.guide.acknowledgement)} />
      <GuideList
        title={props.t('alertIntegrations.limitations')}
        values={props.guide.limitations.map(key => props.t(key))}
      />
    </div>
  );
}

function ReadinessEvidence({ guide, t }: { guide: AlertIntegrationGuideModel; t: TFunction }) {
  if (guide.readiness === 'ready')
    return <Alert type="success" showIcon message={t('alertIntegrations.readiness.ready')} />;
  return (
    <Alert
      type={guide.readiness === 'guide_blocked' ? 'error' : 'warning'}
      showIcon
      message={t(`alertIntegrations.readiness.${guide.readiness}`)}
    />
  );
}

function GuideFacts({ guide, t }: { guide: AlertIntegrationGuideModel; t: TFunction }) {
  return (
    <dl className={styles.facts}>
      <div>
        <dt>{t('alertIntegrations.method')}</dt>
        <dd>{guide.method}</dd>
      </div>
      <div>
        <dt>{t('alertIntegrations.payloadShape')}</dt>
        <dd>{guide.payloadShape}</dd>
      </div>
    </dl>
  );
}

function RunnableContract(props: GuideProps) {
  return (
    <section className={styles.step}>
      <ContractBlock
        label={props.t('alertIntegrations.endpoint')}
        value={props.endpoint}
        outcome={copyOutcome(props.copyState, props.guide.source, 'endpoint')}
        t={props.t}
        onCopy={props.onCopyEndpoint}
      />
      <ContractBlock
        label={props.t('alertIntegrations.authorizationHeader')}
        value={props.authorizationHeader}
        outcome={copyOutcome(props.copyState, props.guide.source, 'authorization')}
        t={props.t}
        onCopy={props.onCopyAuthorization}
      />
      <a
        href={props.tokenSettingsPath}
        onClick={event => {
          event.preventDefault();
          props.onOpenTokenSettings();
        }}
      >
        {props.t('alertIntegrations.manageTokens')}
      </a>
    </section>
  );
}

function GuideList({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <section className={styles.step}>
      <Typography.Title level={3}>{title}</Typography.Title>
      <ul>
        {values.map(value => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </section>
  );
}

function Snippets({ snippets, t }: { snippets: string[]; t: TFunction }) {
  if (snippets.length === 0) return null;
  return (
    <section className={styles.step}>
      <Typography.Title level={3}>{t('alertIntegrations.snippets')}</Typography.Title>
      {snippets.map(snippet => (
        <pre key={snippet}>
          <code>{snippet}</code>
        </pre>
      ))}
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
  const copyLabel = readCopyLabel(props.outcome, props.t);
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

function readCopyLabel(outcome: 'copied' | 'failed' | null, t: TFunction) {
  if (outcome === 'failed') return t('alertIntegrations.copyFailed');
  if (outcome === 'copied') return t('alertIntegrations.copied');
  return t('alertIntegrations.copy');
}

function copyOutcome(state: AlertIntegrationCopyState, source: string, target: 'endpoint' | 'authorization') {
  return state?.source === source && state.target === target ? state.outcome : null;
}
