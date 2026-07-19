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

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { NoticeTemplateRecovery } from '../controller/notice-template-command-state';

export function NoticeTemplateRecoveryAlert({
  busy,
  recovery,
  retry
}: {
  busy: boolean;
  recovery: NoticeTemplateRecovery | null;
  retry: () => void;
}) {
  const { t } = useTranslation();
  if (!recovery || recovery.stage === 'projection') return null;
  const messageKey = recovery.stage === 'delete-proof' ? 'noticeTemplates.deleteFailed' : 'noticeTemplates.saveFailed';
  const action =
    recovery.stage === 'commit-uncertain' ? undefined : (
      <Button size="small" disabled={busy} onClick={retry}>
        {t('common.retry')}
      </Button>
    );
  return (
    <Alert
      showIcon
      type="warning"
      message={t(messageKey)}
      description={t('common.routeError.description')}
      action={action}
    />
  );
}
