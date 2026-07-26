/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertInhibitManagementContext } from '../model/alert-inhibit-model';
import styles from '../shared/alert-policy-page.module.css';

export function AlertInhibitManagementContextBar({
  context,
  missingCount,
  busy,
  viewAll,
  viewMatched,
  returnToEntity
}: {
  context: AlertInhibitManagementContext | null;
  missingCount: number;
  busy: boolean;
  viewAll: () => unknown;
  viewMatched: () => unknown;
  returnToEntity: () => unknown;
}) {
  const { t } = useTranslation();
  if (!context) return null;
  return (
    <section className={styles.managementContext} role="region" aria-label={t('alertInhibits.management.title')}>
      <div>
        <Typography.Text strong>
          {context.entityName ||
            context.returnLabel ||
            t('alertInhibits.management.entityFallback', { id: context.entityId })}
        </Typography.Text>
        <Typography.Paragraph type="secondary">
          {t(
            context.mode === 'matched'
              ? 'alertInhibits.management.matchedDescription'
              : 'alertInhibits.management.allDescription'
          )}
        </Typography.Paragraph>
        {context.mode === 'matched' && context.matchingRuleIds.length === 0 ? (
          <Alert showIcon type="info" message={t('alertInhibits.management.empty')} />
        ) : null}
        {context.mode === 'matched' && missingCount > 0 ? (
          <Alert showIcon type="warning" message={t('alertInhibits.management.missing', { count: missingCount })} />
        ) : null}
      </div>
      <Space wrap>
        {context.mode === 'matched' ? (
          <Button disabled={busy} onClick={() => void viewAll()}>
            {t('alertInhibits.management.viewAll')}
          </Button>
        ) : (
          <Button disabled={busy} onClick={() => void viewMatched()}>
            {t('alertInhibits.management.viewMatched')}
          </Button>
        )}
        <Button disabled={busy} onClick={() => void returnToEntity()}>
          {t('alertInhibits.management.return')}
        </Button>
      </Space>
    </section>
  );
}
