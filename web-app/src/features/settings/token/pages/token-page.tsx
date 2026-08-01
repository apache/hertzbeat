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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';

import { TokenList } from '../components/token-list';
import { GeneratedTokenModal, TokenGeneratorModal } from '../components/token-modals';
import { useTokenResourceController } from '../controller/token-resource-controller';
import { useTokenReturnNavigation } from '../controller/use-token-return-navigation';

export function TokenPage() {
  const { t } = useTranslation();
  const controller = useTokenResourceController();
  const navigation = useTokenReturnNavigation(
    controller.state.generating ||
      controller.state.generationRecovery !== null ||
      controller.state.generatedToken !== null
  );

  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t('token.title')}
        description={t('token.description')}
        actions={
          <>
            {navigation.returnTo && (
              <Button disabled={navigation.blocked} onClick={navigation.back}>
                {t('common.back')}
              </Button>
            )}
            <Button
              type="primary"
              aria-label={t('token.generate')}
              disabled={controller.state.generationRecovery !== null}
              loading={controller.state.generating}
              onClick={controller.openGenerator}
            >
              {t('token.generate')}
            </Button>
          </>
        }
      />
      <TokenList
        list={controller.state.list}
        refreshing={controller.state.refreshing}
        revokingId={controller.state.revokingId}
        onRetry={controller.retry}
        onRevoke={controller.revoke}
      />
      {controller.state.draft && (
        <TokenGeneratorModal
          draft={controller.state.draft}
          saving={controller.state.generating}
          uncertain={controller.state.generationRecovery !== null}
          onChange={controller.updateDraft}
          onCancel={controller.closeGenerator}
          onSubmit={() => void controller.generate()}
        />
      )}
      {controller.state.generatedToken && (
        <GeneratedTokenModal
          token={controller.state.generatedToken}
          onCopy={() => void controller.copyGeneratedToken()}
          onClose={controller.closeGeneratedToken}
        />
      )}
    </OperationalPage>
  );
}
