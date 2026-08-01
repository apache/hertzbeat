/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, List, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EntityDetail, EntityNextActionType } from '../model/entity-contract';
import { entityNextActionRequiresWrite } from '../model/entity-operational-navigation';
import styles from './entity-view.module.css';

/**
 * Keeps server recommendations progressive: an ordinary entity remains compact,
 * while actionable evidence exposes the same safe operations as the surrounding workspace.
 */
export function EntityOperationalGuidance({
  detail,
  canWrite,
  act
}: {
  detail: EntityDetail;
  canWrite: boolean;
  act: (action: EntityNextActionType) => void;
}) {
  const { t } = useTranslation();
  // Recommendations are entity evidence, not an authorization decision.
  // Preserve read-only guidance while keeping mutation paths out of a read-only session.
  const actions = (detail.nextActions ?? []).filter(
    action => canWrite || !entityNextActionRequiresWrite(action.actionType)
  );
  if (actions.length === 0) return null;
  return (
    <section className={styles.section} aria-label={t('entity.operations.title')}>
      <Space className={styles.sectionHeading ?? ''} align="baseline">
        <Typography.Title level={4}>{t('entity.operations.title')}</Typography.Title>
        {detail.opsSummary ? (
          <Typography.Text type="secondary">
            {t('entity.operations.readiness', { score: detail.opsSummary.readinessScore })}
          </Typography.Text>
        ) : null}
      </Space>
      <List
        size="small"
        dataSource={actions}
        renderItem={action => (
          <List.Item
            actions={[
              <Button key={action.actionType} size="small" onClick={() => act(action.actionType)}>
                {action.actionLabel}
              </Button>
            ]}
          >
            <List.Item.Meta title={action.title} description={action.summary} />
          </List.Item>
        )}
      />
    </section>
  );
}
