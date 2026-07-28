/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import type { StatusComponent } from '../model/status-management-contract';
import type { StatusCollectionState } from '../model/status-management-model';
import { ComponentResults } from './status-component-results';
import { StatusDeleteRecoveryAlert } from './status-delete-recovery-alert';
import styles from './status-management.module.css';
import { StatusSectionHeading } from './status-section-heading';

type StatusComponentSectionProps = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  orgId: number | undefined;
  state: StatusCollectionState<StatusComponent>;
  commandLocked: boolean;
  deleteRecovery: boolean;
  deleteRecoveryPending: boolean;
  onNew: () => void;
  onRefresh: () => Promise<boolean>;
  onEdit: (record: StatusComponent) => void;
  onDelete: (id: number) => void;
};

export function StatusComponentSection(props: StatusComponentSectionProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <StatusSectionHeading
        title={t('status.components')}
        description={t('statusManagement.componentsDescription')}
        action={
          <Space>
            <Button disabled={props.commandLocked} onClick={() => void props.onRefresh()}>
              {t('common.refresh')}
            </Button>
            {props.canCreate && (
              <Button type="primary" disabled={!props.orgId || props.commandLocked} onClick={props.onNew}>
                {t('statusManagement.newComponent')}
              </Button>
            )}
          </Space>
        }
      />
      {props.deleteRecovery && (
        <StatusDeleteRecoveryAlert pending={props.deleteRecoveryPending} onRetry={() => void props.onRefresh()} />
      )}
      <ComponentResults
        state={props.state}
        canUpdate={props.canUpdate}
        canDelete={props.canDelete}
        commandLocked={props.commandLocked}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
      />
    </section>
  );
}
