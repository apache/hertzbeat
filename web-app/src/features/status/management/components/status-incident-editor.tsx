/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Form, Modal } from 'antd';
import { useTranslation } from 'react-i18next';

import type { StatusComponent, StatusIncident } from '../model/status-management-contract';
import { buildIncidentPayload } from '../model/status-management-model';
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
  const isNew = props.incident.id == null;
  const submit = (values: StatusIncidentFormValue) => {
    if (props.commandLocked) return;
    props.onSubmit(
      buildIncidentPayload({
        incident: { ...props.incident, name: values.name, state: values.state },
        components: props.components,
        componentIds: values.componentIds,
        message: values.message,
        timestamp: Date.now()
      })
    );
  };
  return (
    <Modal
      open
      width={680}
      closable={!props.commandLocked}
      keyboard={!props.commandLocked}
      maskClosable={!props.commandLocked}
      destroyOnHidden
      title={t(isNew ? 'statusManagement.newIncident' : 'statusManagement.updateIncident')}
      okText={t(props.writeRecovery === 'proof' ? 'common.retry' : 'common.save')}
      confirmLoading={props.saving}
      okButtonProps={{
        disabled: props.writeRecovery === 'commit-uncertain' || (props.commandLocked && !props.writeRecovery)
      }}
      cancelButtonProps={{ disabled: props.commandLocked }}
      onCancel={() => {
        if (!props.commandLocked) props.onCancel();
      }}
      onOk={() => {
        if (props.writeRecovery === 'proof') props.onRetry();
        else if (!props.commandLocked) form.submit();
      }}
    >
      {props.writeRecovery && <StatusWriteRecoveryAlert />}
      <Form
        form={form}
        disabled={props.commandLocked || Boolean(props.writeRecovery)}
        layout="vertical"
        initialValues={incidentFormValue(props.incident)}
        onFinish={submit}
      >
        <StatusIncidentFields components={props.components} />
      </Form>
      {!isNew && props.incident.contents?.length ? <StatusIncidentHistory contents={props.incident.contents} /> : null}
    </Modal>
  );
}

function incidentFormValue(incident: StatusIncident): StatusIncidentFormValue {
  return {
    name: incident.name,
    state: incident.state,
    componentIds: incident.components?.flatMap(item => (item.id == null ? [] : [item.id])) ?? [],
    message: ''
  };
}
