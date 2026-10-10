/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalPageHeader } from '@/shared/operational-page';

interface StatusManagementHeaderProps {
  publicStatusHref?: string;
  canPublish?: boolean;
  publishDisabled?: boolean;
  onPublish?: () => void;
}

/** Keeps the heading presentational while its page owns the public route policy. */
export function StatusManagementHeader({
  publicStatusHref,
  canPublish = false,
  publishDisabled = false,
  onPublish
}: StatusManagementHeaderProps) {
  const { t } = useTranslation();

  return (
    <OperationalPageHeader
      title={t('statusManagement.title')}
      description={t('statusManagement.description')}
      actions={
        publicStatusHref || (canPublish && onPublish) ? (
          <Space>
            {publicStatusHref && (
              <Button href={publicStatusHref} target="_blank" rel="noreferrer">
                {t('statusManagement.openPublicPage')}
              </Button>
            )}
            {canPublish && onPublish && (
              <Button type="primary" disabled={publishDisabled} onClick={onPublish}>
                {t('statusManagement.publishIncident')}
              </Button>
            )}
          </Space>
        ) : undefined
      }
    />
  );
}
