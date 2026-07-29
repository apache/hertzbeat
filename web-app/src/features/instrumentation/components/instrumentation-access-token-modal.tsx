/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Input, Modal, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  accessTokenExpirationDefinitions,
  type AccessTokenGenerationDraft
} from '@/shared/access-token/access-token-generation-model';

import styles from './instrumentation-configure.module.css';

type InstrumentationAccessTokenModalProps = {
  draft: AccessTokenGenerationDraft;
  tokenGenerating: boolean;
  tokenError: boolean;
  onClose: () => void;
  onDraft: (draft: AccessTokenGenerationDraft) => void;
  onGenerate: () => void;
};

export function InstrumentationAccessTokenModal(props: InstrumentationAccessTokenModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      title={t('instrumentation.token.generateTitle')}
      okText={t('instrumentation.token.generate')}
      cancelText={t('common.cancel')}
      confirmLoading={props.tokenGenerating}
      closable={!props.tokenGenerating}
      maskClosable={!props.tokenGenerating}
      onCancel={props.onClose}
      onOk={props.onGenerate}
    >
      {props.tokenError && <Alert type="error" showIcon message={t('instrumentation.token.generateError')} />}
      <div className={styles.tokenForm}>
        <label>
          <Typography.Text strong>{t('instrumentation.token.name')}</Typography.Text>
          <Input
            aria-label={t('instrumentation.token.name')}
            disabled={props.tokenGenerating}
            value={props.draft.name}
            onChange={event => props.onDraft({ ...props.draft, name: event.target.value })}
          />
        </label>
        <label>
          <Typography.Text strong>{t('instrumentation.token.expires')}</Typography.Text>
          <Select
            aria-label={t('instrumentation.token.expires')}
            disabled={props.tokenGenerating}
            value={props.draft.expireSeconds}
            options={accessTokenExpirationDefinitions.map(definition => ({
              value: definition.value,
              label: t(definition.labelKey)
            }))}
            onChange={expireSeconds => props.onDraft({ ...props.draft, expireSeconds })}
          />
        </label>
        <div>
          <Typography.Text strong>{t('instrumentation.token.scope')}</Typography.Text>
          <Typography.Text>{t('instrumentation.token.fixedScope')}</Typography.Text>
        </div>
      </div>
    </Modal>
  );
}
