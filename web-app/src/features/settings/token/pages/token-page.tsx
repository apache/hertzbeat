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

import { SettingsNav } from '@/shared/settings/settings-nav';

import { TokenList } from '../components/token-list';
import { GeneratedTokenModal, TokenGeneratorModal } from '../components/token-modals';
import { TokenPageHeader } from '../components/token-page-header';
import styles from '../components/token.module.css';
import { useTokenResourceController } from '../controller/token-resource-controller';

export function TokenPage() {
  const controller = useTokenResourceController();

  return (
    <div className={styles.page}>
      <TokenPageHeader
        generating={controller.state.generating}
        onGenerate={controller.openGenerator}
      />
      <SettingsNav />
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
          onChange={controller.updateDraft}
          onCancel={controller.closeGenerator}
          onSubmit={() => { void controller.generate(); }}
        />
      )}
      {controller.state.generatedToken && (
        <GeneratedTokenModal
          token={controller.state.generatedToken}
          onCopy={() => { void controller.copyGeneratedToken(); }}
          onClose={controller.closeGeneratedToken}
        />
      )}
    </div>
  );
}
