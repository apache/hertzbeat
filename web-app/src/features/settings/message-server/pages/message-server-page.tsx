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

import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalPageHeader, OperationalResultRegion } from '@/shared/operational-page';

import { EmailServerEditor, SmsServerEditor } from '../components/message-server-editors';
import { createMessageServerEditorRecovery } from '../components/message-server-editor-recovery';
import { useMessageServerController } from '../controller/use-message-server-controller';
import { EmailServerChannelRow, SmsServerChannelRow } from './message-server-channel-rows';
import styles from './message-server-page.module.css';

export function MessageServerPage() {
  const { t } = useTranslation();
  const controller = useMessageServerController();
  return (
    <OperationalPage>
      <OperationalPageHeader title={t('messageServer.title')} description={t('messageServer.description')} />
      <OperationalResultRegion>
        <div className={styles.channels}>
          <EmailServerChannelRow controller={controller} />
          <SmsServerChannelRow controller={controller} />
        </div>
      </OperationalResultRegion>
      {controller.capabilities.canConfigure && controller.emailDraft && (
        <EmailServerEditor
          draft={controller.emailDraft}
          saving={controller.savingEmail}
          locked={controller.emailLocked}
          recovery={createMessageServerEditorRecovery(
            controller.emailSaveRecovery,
            controller.emailSaveRecoveryRetryable,
            controller.provingEmail,
            controller.actions.retryEmailSave
          )}
          update={controller.actions.updateEmail}
          setSecretCleared={controller.actions.setEmailSecretCleared}
          close={controller.actions.closeEmail}
          submit={() => {
            void controller.actions.submitEmail();
          }}
        />
      )}
      {controller.capabilities.canConfigure && controller.smsDraft && (
        <SmsServerEditor
          draft={controller.smsDraft}
          saving={controller.savingSms}
          locked={controller.smsLocked}
          recovery={createMessageServerEditorRecovery(
            controller.smsSaveRecovery,
            controller.smsSaveRecoveryRetryable,
            controller.provingSms,
            controller.actions.retrySmsSave
          )}
          replace={controller.actions.replaceSms}
          close={controller.actions.closeSms}
          submit={() => {
            void controller.actions.submitSms();
          }}
        />
      )}
    </OperationalPage>
  );
}
