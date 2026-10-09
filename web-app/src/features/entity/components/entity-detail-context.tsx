/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EntityRecord, EntityStatus } from '../model/entity-contract';
import { localizeEntityCode } from '../model/entity-display';
import { focusEntityDetailChapter } from './entity-detail-focus';
import styles from './entity-detail-navigation.module.css';

export function EntityDetailContext({
  entity,
  status,
  unavailable = false
}: {
  entity: EntityRecord;
  status?: EntityStatus | undefined;
  unavailable?: boolean;
}) {
  const { t } = useTranslation();
  const value = localizeEntityCode(t, 'status', unavailable ? 'unknown' : (status?.status ?? 'unknown'));
  return (
    <span className={styles.context}>
      <span>
        {t('entity.fields.type')}: <strong>{localizeEntityCode(t, 'type', entity.type)}</strong>
      </span>
      <span>
        {t('entity.fields.environment')}: <strong>{entity.environment || '—'}</strong>
      </span>
      {unavailable ? (
        <span>
          {t('entity.fields.status')}: {value}
        </span>
      ) : (
        <Button type="link" onClick={() => focusEntityDetailChapter('entity-details', 'entity-status-evidence')}>
          {t('entity.fields.status')}: {value}
        </Button>
      )}
      <span>
        {t('entity.fields.source')}: {localizeEntityCode(t, 'source', entity.source)}
      </span>
    </span>
  );
}
