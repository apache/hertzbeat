/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
