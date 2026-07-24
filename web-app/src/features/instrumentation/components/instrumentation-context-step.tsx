/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Alert, Button, Input, Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { IntakeProfilesResponse, ServiceIdentity } from '../model/instrumentation-v2-contract';
import styles from './instrumentation-shell.module.css';

export function InstrumentationContextStep(props: {
  profiles: IntakeProfilesResponse;
  profileId: string;
  service: ServiceIdentity;
  canRender: boolean;
  rendering: boolean;
  renderError: boolean;
  onProfile: (intakeProfileId: string) => void;
  onService: (patch: Partial<ServiceIdentity>) => void;
  onRender: () => void;
}) {
  const { t } = useTranslation();
  if (props.profiles.status !== 'available') {
    return (
      <Alert
        type={props.profiles.status === 'unavailable' ? 'error' : 'warning'}
        showIcon
        message={t(`instrumentation.v2.profile.${props.profiles.status}`)}
      />
    );
  }
  return <AvailableContextStep {...props} />;
}

function AvailableContextStep(props: Parameters<typeof InstrumentationContextStep>[0]) {
  const { t } = useTranslation();
  const available = props.profiles.profiles.filter(profile => profile.availability === 'available');
  const defaultProfile = available.find(profile => profile.id === props.profiles.defaultProfileId);
  const alternatives = props.profiles.profiles.filter(profile => profile.id !== defaultProfile?.id);
  return (
    <section className={styles.section} aria-labelledby="instrumentation-context-title">
      <Typography.Title id="instrumentation-context-title" level={4}>
        {t('instrumentation.v2.contextTitle')}
      </Typography.Title>
      <div className={styles.formGrid}>
        <ServiceFields service={props.service} onService={props.onService} />
      </div>
      <Space direction="vertical" className={styles.fullWidth!}>
        <Typography.Text strong>{t('instrumentation.v2.destination')}</Typography.Text>
        {defaultProfile && (
          <Button
            type={props.profileId === defaultProfile.id ? 'primary' : 'default'}
            onClick={() => props.onProfile(defaultProfile.id)}
          >
            {t(`instrumentation.v2.profileKind.${defaultProfile.kind}`)}
          </Button>
        )}
        {alternatives.length > 0 && (
          <Select
            value={alternatives.some(item => item.id === props.profileId) ? props.profileId : null}
            placeholder={t('instrumentation.v2.advancedDestination')}
            options={alternatives.map(profile => ({
              value: profile.id,
              disabled: profile.availability === 'unavailable',
              label: `${t(`instrumentation.v2.profileKind.${profile.kind}`)} · ${t(
                `instrumentation.v2.profileAvailability.${profile.availability}`
              )}`
            }))}
            onChange={props.onProfile}
          />
        )}
      </Space>
      <Button type="primary" disabled={!props.canRender} loading={props.rendering} onClick={props.onRender}>
        {t('instrumentation.action.render')}
      </Button>
      {props.renderError && <Alert type="error" showIcon message={t('instrumentation.v2.renderError')} />}
    </section>
  );
}

function ServiceFields(props: { service: ServiceIdentity; onService: (patch: Partial<ServiceIdentity>) => void }) {
  const { t } = useTranslation();
  return (
    <>
      <Field
        label={t('instrumentation.field.serviceName')}
        value={props.service.name}
        onChange={name => props.onService({ name })}
      />
      <Field
        label={t('instrumentation.field.serviceNamespace')}
        value={props.service.namespace}
        onChange={namespace => props.onService({ namespace })}
      />
      <Field
        label={t('instrumentation.field.serviceEnvironment')}
        value={props.service.environment}
        onChange={environment => props.onService({ environment })}
      />
      <Field
        label={t('instrumentation.field.serviceInstanceId')}
        value={props.service.serviceInstanceId ?? ''}
        onChange={serviceInstanceId => props.onService({ serviceInstanceId: serviceInstanceId || undefined })}
      />
      <Field
        label={t('instrumentation.field.endpoint')}
        value={props.service.endpoint ?? ''}
        onChange={endpoint => props.onService({ endpoint: endpoint || undefined })}
      />
    </>
  );
}

function Field(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <Typography.Text strong>{props.label}</Typography.Text>
      <Input value={props.value} onChange={event => props.onChange(event.target.value)} />
    </label>
  );
}
