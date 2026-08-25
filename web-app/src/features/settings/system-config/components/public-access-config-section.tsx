/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalFormActions, OperationalStatePanel } from '@/shared/operational-page';

import { usePublicAccessConfigController } from '../controller/use-public-access-config-controller';
import { derivePublicAccessEndpoints, type PublicAccessConfigDraft } from '../model/public-access-config-model';
import styles from './system-config-editor.module.css';

export function PublicAccessConfigSection({ canConfigure }: { canConfigure: boolean }) {
  const { t } = useTranslation();
  const controller = usePublicAccessConfigController(canConfigure);
  const state = controller.state;

  return (
    <section className={styles.section} aria-labelledby="public-access-config-title">
      <header className={styles.sectionHeading}>
        <Typography.Title id="public-access-config-title" level={3}>
          {t('systemConfig.publicAccess.title')}
        </Typography.Title>
        <Typography.Paragraph type="secondary">{t('systemConfig.publicAccess.description')}</Typography.Paragraph>
      </header>
      {state.kind === 'loading' && (
        <OperationalStatePanel kind="loading" title={t('systemConfig.publicAccess.loading')} presentation="quiet" />
      )}
      {(state.kind === 'unavailable' || state.kind === 'invalid') && (
        <OperationalStatePanel
          kind={state.kind === 'invalid' ? 'error' : 'unavailable'}
          title={t(`systemConfig.publicAccess.${state.kind}`)}
          action={
            <Button size="small" onClick={controller.actions.retry}>
              {t('common.retry')}
            </Button>
          }
          presentation="quiet"
        />
      )}
      {state.kind === 'ready' && (
        <>
          <div className={styles.form}>
            <PublicAddressField
              field="publicBaseUrl"
              label={t('systemConfig.publicAccess.publicBaseUrl')}
              help={t('systemConfig.publicAccess.publicBaseUrlHelp')}
              value={state.current.publicBaseUrl}
              disabled={!canConfigure || state.saving}
              update={controller.actions.update}
            />
            <OtlpOverrideFields
              draft={state.current}
              disabled={!canConfigure || state.saving}
              update={controller.actions.update}
            />
          </div>
          {canConfigure && state.dirty && (
            <OperationalFormActions>
              <Button type="primary" loading={state.saving} disabled={!state.valid} onClick={controller.actions.save}>
                {t('common.save')}
              </Button>
              <Button disabled={state.saving} onClick={controller.actions.discard}>
                {t('systemConfig.discard')}
              </Button>
            </OperationalFormActions>
          )}
        </>
      )}
    </section>
  );
}

function OtlpOverrideFields({
  draft,
  disabled,
  update
}: {
  draft: PublicAccessConfigDraft;
  disabled: boolean;
  update: (field: keyof PublicAccessConfigDraft, value: string) => void;
}) {
  const { t } = useTranslation();
  const defaults = derivePublicAccessEndpoints(draft.publicBaseUrl);
  const [advancedOpen, setAdvancedOpen] = useState(() =>
    Boolean(draft.serverOtlpHttpEndpoint || draft.serverOtlpGrpcEndpoint)
  );

  return (
    <details
      className={styles.advanced}
      open={advancedOpen}
      onToggle={event => setAdvancedOpen(event.currentTarget.open)}
    >
      <summary className={styles.advancedSummary}>
        <RightOutlined className={styles.advancedChevron} aria-hidden />
        <span className={styles.advancedCopy}>
          <span className={styles.advancedTitle}>{t('systemConfig.publicAccess.advancedTitle')}</span>
          <Typography.Text type="secondary">{t('systemConfig.publicAccess.advancedHelp')}</Typography.Text>
        </span>
      </summary>
      <div className={styles.advancedFields}>
        <PublicAddressField
          field="serverOtlpHttpEndpoint"
          label={t('systemConfig.publicAccess.otlpHttp')}
          help={t('systemConfig.publicAccess.otlpHttpHelp')}
          value={draft.serverOtlpHttpEndpoint}
          {...(defaults?.http ? { placeholder: defaults.http } : {})}
          disabled={disabled}
          update={update}
        />
        <PublicAddressField
          field="serverOtlpGrpcEndpoint"
          label={t('systemConfig.publicAccess.otlpGrpc')}
          help={t('systemConfig.publicAccess.otlpGrpcHelp')}
          value={draft.serverOtlpGrpcEndpoint}
          {...(defaults?.grpc ? { placeholder: defaults.grpc } : {})}
          disabled={disabled}
          update={update}
        />
      </div>
    </details>
  );
}

function PublicAddressField({
  field,
  label,
  help,
  value,
  placeholder,
  disabled,
  update
}: {
  field: keyof PublicAccessConfigDraft;
  label: string;
  help: string;
  value: string;
  placeholder?: string;
  disabled: boolean;
  update: (field: keyof PublicAccessConfigDraft, value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.control}>
        <Input
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={event => update(field, event.target.value)}
        />
        <Typography.Text type="secondary">{help}</Typography.Text>
      </span>
    </label>
  );
}
