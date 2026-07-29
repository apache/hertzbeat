/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Input, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from './instrumentation-configure.module.css';

export function InstrumentationPlatformField(props: {
  platform?: string | undefined;
  options: string[];
  onPlatform: (platform: string) => void;
}) {
  const { t } = useTranslation();
  if (props.options.length <= 1) return null;
  return (
    <label className={styles.serviceNameField}>
      <Typography.Text strong>{t('instrumentation.field.platform')}</Typography.Text>
      <Select
        aria-label={t('instrumentation.field.platform')}
        value={props.platform ?? null}
        options={props.options.map(platform => ({
          value: platform,
          label: t(`instrumentation.platform.${platform}`, { defaultValue: platform })
        }))}
        onChange={props.onPlatform}
      />
    </label>
  );
}

export function InstrumentationTokenField(props: { token: string; onToken: (token: string) => void }) {
  const { t } = useTranslation();
  return (
    <label className={styles.serviceNameField}>
      <Typography.Text strong>{t('instrumentation.field.token')}</Typography.Text>
      <Input.Password
        aria-label={t('instrumentation.field.token')}
        autoComplete="off"
        placeholder={t('instrumentation.field.tokenPlaceholder')}
        value={props.token}
        onChange={event => props.onToken(event.target.value)}
      />
      <Typography.Text type="secondary">{t('instrumentation.field.tokenMemory')}</Typography.Text>
    </label>
  );
}
