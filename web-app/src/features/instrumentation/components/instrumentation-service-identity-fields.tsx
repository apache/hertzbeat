/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { ServiceIdentity } from '../model/instrumentation-v2-contract';
import styles from './instrumentation-configure.module.css';

export function InstrumentationServiceIdentityFields(props: {
  service: ServiceIdentity;
  onService: (patch: Partial<ServiceIdentity>) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <ServiceIdentityField
        label={t('instrumentation.field.serviceName')}
        value={props.service.name}
        onChange={name => props.onService({ name })}
      />
      <ServiceIdentityField
        label={t('instrumentation.field.serviceEnvironment')}
        value={props.service.environment}
        onChange={environment => props.onService({ environment })}
      />
      <details className={styles.advancedIdentity}>
        <summary>{t('instrumentation.action.reviewContext')}</summary>
        <div className={styles.advancedIdentityFields}>
          <ServiceIdentityField
            label={t('instrumentation.field.serviceNamespace')}
            value={props.service.namespace}
            onChange={namespace => props.onService({ namespace })}
          />
          <ServiceIdentityField
            label={t('instrumentation.field.serviceInstanceId')}
            value={props.service.serviceInstanceId ?? ''}
            onChange={serviceInstanceId => props.onService({ serviceInstanceId })}
          />
          <ServiceIdentityField
            label={t('instrumentation.field.endpoint')}
            value={props.service.endpoint ?? ''}
            onChange={endpoint => props.onService({ endpoint })}
          />
        </div>
      </details>
    </>
  );
}

function ServiceIdentityField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.serviceNameField}>
      <Typography.Text strong>{props.label}</Typography.Text>
      <Input aria-label={props.label} value={props.value} onChange={event => props.onChange(event.target.value)} />
    </label>
  );
}
