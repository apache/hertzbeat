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

import { OperationalPage, OperationalResultRegion } from '@/shared/operational-page';

import { BulletinEditor } from '../components/bulletin-editor';
import { BulletinPageControls } from '../components/bulletin-page-controls';
import { BulletinPageStatus } from '../components/bulletin-page-status';
import { BulletinWorkspace } from '../components/bulletin-workspace';
import { useBulletinController } from '../controller/bulletin-controller';

export function BulletinPage() {
  const { state, actions } = useBulletinController();
  const commandActive = state.command !== 'idle';
  const writeLocked = commandActive || state.recovery !== null;
  const records = state.list.kind === 'ready' ? state.list.records : [];
  return (
    <OperationalPage>
      <BulletinPageControls
        actions={actions}
        capabilities={state.capabilities}
        commandActive={commandActive}
        refreshing={state.refreshing}
        refreshSeconds={state.refreshSeconds}
        search={state.search}
        writeLocked={writeLocked}
      />
      <OperationalResultRegion>
        <BulletinPageStatus
          command={state.command}
          list={state.list}
          notice={state.notice}
          recovery={state.recovery}
          onDismissNotice={actions.dismissNotice}
          onRetry={() => void actions.retry()}
          onStopVerification={actions.stopVerification}
        />
        <BulletinWorkspace
          actions={actions}
          capabilities={state.capabilities}
          listKind={state.list.kind}
          metrics={state.metrics}
          query={state.query}
          readLocked={commandActive}
          records={records}
          selectedId={state.selectedId}
          selectedIds={state.selectedIds}
          total={state.list.kind === 'ready' ? state.list.total : 0}
          writeLocked={writeLocked}
        />
      </OperationalResultRegion>
      {state.capabilities.canWrite && (
        <BulletinEditor
          draft={state.draft}
          dependencies={state.dependencies}
          saving={state.command === 'saving'}
          writeLocked={writeLocked}
          onClose={actions.close}
          onSave={() => void actions.save()}
          onChange={actions.updateDraft}
        />
      )}
    </OperationalPage>
  );
}
