/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ExclamationCircleFilled } from '@ant-design/icons';
import { Button, Form, Modal, Space, Steps, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { StatusComponent, StatusIncident } from '../model/status-management-contract';
import { buildIncidentPayload, incidentStateKey, statusIncidentState } from '../model/status-management-model';
import { StatusIncidentFields, type StatusIncidentFormValue } from './status-incident-fields';
import { StatusIncidentHistory } from './status-incident-history';
import { StatusWriteRecoveryAlert } from './status-write-recovery-alert';

type StatusIncidentEditorProps = {
  incident: StatusIncident;
  components: StatusComponent[];
  commandLocked: boolean;
  writeRecovery: 'proof' | 'commit-uncertain' | undefined;
  saving: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onSubmit: (incident: StatusIncident) => void;
};

export function StatusIncidentEditor(props: StatusIncidentEditorProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<StatusIncidentFormValue>();
  const [step, setStep] = useState<0 | 1>(0);
  const [review, setReview] = useState<StatusIncidentFormValue>();
  const isNew = props.incident.id === undefined;
  const submit = (values: StatusIncidentFormValue) => {
    if (props.commandLocked) return;
    props.onSubmit(
      buildIncidentPayload({
        incident: {
          ...props.incident,
          name: values.name,
          state: values.state
        },
        components: props.components,
        componentIds: values.componentIds,
        message: values.message,
        timestamp: Date.now()
      })
    );
  };
  const reviewIncident = async () => {
    if (props.commandLocked || props.writeRecovery) return;
    try {
      const values = await form.validateFields();
      setReview(values);
      setStep(1);
    } catch {
      // Ant Form renders the field-level validation errors for the author.
    }
  };
  const publishIncident = () => {
    if (review) submit(review);
  };
  return (
    <Modal
      open
      centered
      className="status-incident-editor"
      width={step === 1 ? 940 : 660}
      closable={!props.commandLocked}
      keyboard={!props.commandLocked}
      maskClosable={!props.commandLocked}
      destroyOnHidden
      title={t(isNew ? 'statusManagement.newIncident' : 'statusManagement.updateIncident')}
      footer={
        <IncidentEditorActions
          commandLocked={props.commandLocked}
          saving={props.saving}
          step={step}
          writeRecovery={props.writeRecovery}
          onBack={() => setStep(0)}
          onCancel={props.onCancel}
          onPublish={publishIncident}
          onRetry={props.onRetry}
          onReview={() => void reviewIncident()}
        />
      }
      onCancel={() => {
        if (!props.commandLocked) props.onCancel();
      }}
    >
      {props.writeRecovery && <StatusWriteRecoveryAlert />}
      <Steps
        className="status-incident-steps"
        current={step}
        items={[{ title: t('statusManagement.incidentInfo') }, { title: t('statusManagement.reviewAndPublish') }]}
        responsive={false}
        size="small"
        type="navigation"
      />
      {step === 0 && (
        <Form
          className="status-incident-form"
          form={form}
          disabled={props.commandLocked || Boolean(props.writeRecovery)}
          layout="vertical"
          initialValues={incidentFormValue(props.incident)}
        >
          <StatusIncidentFields components={props.components} />
        </Form>
      )}
      {step === 1 && review && <StatusIncidentReview values={review} components={props.components} />}
      {step === 0 && !isNew && props.incident.contents?.length ? (
        <StatusIncidentHistory contents={props.incident.contents} />
      ) : null}
    </Modal>
  );
}

type IncidentEditorActionsProps = {
  commandLocked: boolean;
  saving: boolean;
  step: 0 | 1;
  writeRecovery: StatusIncidentEditorProps['writeRecovery'];
  onBack: () => void;
  onCancel: () => void;
  onPublish: () => void;
  onRetry: () => void;
  onReview: () => void;
};

function IncidentEditorActions({
  commandLocked,
  saving,
  step,
  writeRecovery,
  onBack,
  onCancel,
  onPublish,
  onRetry,
  onReview
}: IncidentEditorActionsProps) {
  const { t } = useTranslation();
  return (
    <Space>
      {step === 1 && (
        <Button disabled={commandLocked} onClick={onBack}>
          {t('statusManagement.backToIncident')}
        </Button>
      )}
      <Button disabled={commandLocked} onClick={onCancel}>
        {t('common.cancel')}
      </Button>
      <IncidentEditorPrimaryAction
        commandLocked={commandLocked}
        saving={saving}
        step={step}
        writeRecovery={writeRecovery}
        onPublish={onPublish}
        onRetry={onRetry}
        onReview={onReview}
      />
    </Space>
  );
}

function IncidentEditorPrimaryAction({
  commandLocked,
  saving,
  step,
  writeRecovery,
  onPublish,
  onRetry,
  onReview
}: Pick<
  IncidentEditorActionsProps,
  'commandLocked' | 'saving' | 'step' | 'writeRecovery' | 'onPublish' | 'onRetry' | 'onReview'
>) {
  const { t } = useTranslation();
  if (writeRecovery === 'proof') {
    return (
      <Button type="primary" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    );
  }
  if (step === 0) {
    return (
      <Button type="primary" loading={saving} disabled={commandLocked} onClick={onReview}>
        {t('statusManagement.reviewIncident')}
      </Button>
    );
  }
  return (
    <Button type="primary" loading={saving} disabled={commandLocked} onClick={onPublish}>
      {t('statusManagement.publishIncident')}
    </Button>
  );
}

function StatusIncidentReview({
  values,
  components
}: {
  values: StatusIncidentFormValue;
  components: StatusComponent[];
}) {
  const { t } = useTranslation();
  const affectedComponents = components.filter(
    component => component.id !== undefined && values.componentIds.includes(component.id)
  );
  return (
    <div className="status-incident-review-workspace">
      <section className="status-incident-review" aria-labelledby="status-incident-review-title">
        <header className="status-incident-review-header">
          <Typography.Title id="status-incident-review-title" level={4}>
            {t('statusManagement.reviewTitle')}
          </Typography.Title>
          <Typography.Paragraph type="secondary">{t('statusManagement.reviewDescription')}</Typography.Paragraph>
        </header>
        <dl className="status-incident-review-list">
          <div>
            <dt>{t('statusManagement.incidentName')}</dt>
            <dd>{values.name.trim()}</dd>
          </div>
          <div>
            <dt>{t('status.state')}</dt>
            <dd>
              <Tag bordered={false}>{t(incidentStateKey(values.state))}</Tag>
            </dd>
          </div>
          <div className="status-incident-review-message">
            <dt>{t('statusManagement.updateMessage')}</dt>
            <dd>{values.message.trim()}</dd>
          </div>
          <div>
            <dt>{t('status.components')}</dt>
            <dd>
              <AffectedComponentList components={affectedComponents} />
            </dd>
          </div>
        </dl>
      </section>
      <StatusIncidentPublicPreview values={values} affectedComponents={affectedComponents} />
    </div>
  );
}

function StatusIncidentPublicPreview({
  values,
  affectedComponents
}: {
  values: StatusIncidentFormValue;
  affectedComponents: StatusComponent[];
}) {
  const { t } = useTranslation();
  return (
    <section className="status-incident-public-preview" aria-labelledby="status-incident-public-preview-title">
      <header>
        <div>
          <Typography.Title id="status-incident-public-preview-title" level={4}>
            {t('statusManagement.publicUpdatePreview')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('statusManagement.previewNotPublished')}</Typography.Text>
        </div>
        <Tag bordered={false}>{t(incidentStateKey(values.state))}</Tag>
      </header>
      <article className="status-incident-public-update" data-resolved={values.state === statusIncidentState.resolved}>
        <span className="status-incident-public-marker" aria-hidden />
        <div>
          <Typography.Title level={5}>{values.name.trim()}</Typography.Title>
          <Typography.Paragraph>{values.message.trim()}</Typography.Paragraph>
          <AffectedComponentList components={affectedComponents} />
        </div>
      </article>
    </section>
  );
}

function AffectedComponentList({ components }: { components: StatusComponent[] }) {
  return (
    <ul className="status-incident-review-components">
      {components.map(component => (
        <li key={`${component.id}:${component.name}`}>
          <ExclamationCircleFilled aria-hidden />
          <span>{component.name}</span>
        </li>
      ))}
    </ul>
  );
}

function incidentFormValue(incident: StatusIncident): StatusIncidentFormValue {
  return {
    name: incident.name,
    state: incident.state,
    componentIds: incident.components?.flatMap(item => (item.id === undefined ? [] : [item.id])) ?? [],
    message: ''
  };
}
