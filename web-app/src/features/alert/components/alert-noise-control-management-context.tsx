/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertNoiseControlManagementContext } from '../shared/alert-noise-control-management';
import styles from '../shared/alert-policy-page.module.css';

type TranslationRoot = 'alertInhibits' | 'alertSilences';

export function AlertNoiseControlManagementContextBar({
  context,
  missingCount,
  busy,
  translationRoot,
  viewAll,
  viewMatched,
  returnToEntity
}: {
  context: AlertNoiseControlManagementContext | null;
  missingCount: number;
  busy: boolean;
  translationRoot: TranslationRoot;
  viewAll: () => unknown;
  viewMatched: () => unknown;
  returnToEntity: () => unknown;
}) {
  const { t } = useTranslation();
  if (!context) return null;
  const key = (name: string) => `${translationRoot}.management.${name}`;
  return (
    <section className={styles.managementContext} role="region" aria-label={t(key('title'))}>
      <div>
        <Typography.Text strong>
          {context.entityName || context.returnLabel || t(key('entityFallback'), { id: context.entityId })}
        </Typography.Text>
        <Typography.Paragraph type="secondary">
          {t(key(context.mode === 'matched' ? 'matchedDescription' : 'allDescription'))}
        </Typography.Paragraph>
        {context.mode === 'matched' && context.matchingRuleIds.length === 0 ? (
          <Alert showIcon type="info" message={t(key('empty'))} />
        ) : null}
        {context.mode === 'matched' && missingCount > 0 ? (
          <Alert showIcon type="warning" message={t(key('missing'), { count: missingCount })} />
        ) : null}
      </div>
      <Space wrap>
        <Button disabled={busy} onClick={() => void (context.mode === 'matched' ? viewAll() : viewMatched())}>
          {t(key(context.mode === 'matched' ? 'viewAll' : 'viewMatched'))}
        </Button>
        <Button disabled={busy} onClick={() => void returnToEntity()}>
          {t(key('return'))}
        </Button>
      </Space>
    </section>
  );
}
