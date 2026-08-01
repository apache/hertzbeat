/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, List } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalSection } from '@/shared/operational-page';

import type { EntityDetail, EntityNextAction, EntityNextActionType } from '../model/entity-contract';
import { entityNextActionRequiresWrite } from '../model/entity-operational-navigation';

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
    <OperationalSection
      title={t('entity.operations.title')}
      description={
        detail.opsSummary ? t('entity.operations.readiness', { score: detail.opsSummary.readinessScore }) : undefined
      }
    >
      <List
        size="small"
        dataSource={actions}
        renderItem={action => (
          <List.Item
            actions={[
              <Button key={action.actionType} size="small" onClick={() => act(action.actionType)}>
                {actionCopy(t, action, 'action')}
              </Button>
            ]}
          >
            <List.Item.Meta title={actionCopy(t, action, 'title')} description={actionCopy(t, action, 'summary')} />
          </List.Item>
        )}
      />
    </OperationalSection>
  );
}

/**
 * Navigation is server-driven through the stable action code, while visible copy
 * belongs to the active UI locale. This avoids leaking the server JVM locale into
 * an otherwise consistently localized resource workspace.
 */
function actionCopy(t: (key: string) => string, action: EntityNextAction, field: 'title' | 'summary' | 'action') {
  return t(`entity.operations.actions.${action.actionType}.${field}`);
}
