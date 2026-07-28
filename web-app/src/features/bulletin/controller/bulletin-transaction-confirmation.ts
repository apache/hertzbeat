/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { useNotification } from '@refinedev/core';
import type { useQueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';

import type { Bulletin } from '../model/bulletin-model';
import type { BulletinEditorController, BulletinOperationGate } from './bulletin-editor-controller';
import { refreshBulletinListProjection } from './bulletin-list-projection';
import type { BulletinProofResult } from './bulletin-write-operations';

type BulletinConfirmationContext = {
  editor: BulletinEditorController;
  gate: BulletinOperationGate;
  refresh: () => Promise<boolean>;
  selectedId: number | null;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  t: (key: string) => string;
};

type QueryClient = ReturnType<typeof useQueryClient>;
type Notification = ReturnType<typeof useNotification>;
type OperationOwner = Parameters<BulletinOperationGate['isCurrent']>[0];

export async function confirmBulletinProofResult(
  result: BulletinProofResult,
  context: BulletinConfirmationContext,
  client: QueryClient,
  notification: Notification,
  confirmedDeletedIds: Set<number>,
  owner: OperationOwner
) {
  if (result.operation === 'save') {
    await confirmBulletinSave(result.saved, context, client, notification, owner);
    return;
  }
  await confirmBulletinDelete(result.ids, result.batch, context, client, notification, confirmedDeletedIds, owner);
}

export async function confirmBulletinSave(
  saved: Bulletin,
  context: BulletinConfirmationContext,
  client: QueryClient,
  notification: Notification,
  owner: OperationOwner
) {
  if (!context.gate.isCurrent(owner)) return;
  context.setSelectedId(saved.id);
  context.editor.controls.setDraft(null);
  notification.open?.({ message: context.t('bulletin.saveSuccess'), type: 'success' });
  await retainProjectionFailure(context, client, owner);
}

export async function confirmBulletinDelete(
  ids: readonly number[],
  batch: boolean,
  context: BulletinConfirmationContext,
  client: QueryClient,
  notification: Notification,
  confirmedDeletedIds: Set<number>,
  owner: OperationOwner
) {
  if (!context.gate.isCurrent(owner)) return;
  ids.forEach(id => confirmedDeletedIds.add(id));
  if (context.selectedId != null && ids.includes(context.selectedId)) context.setSelectedId(null);
  notification.open?.({
    message: context.t(batch ? 'bulletin.deleteSelectedSuccess' : 'bulletin.deleteSuccess'),
    type: 'success'
  });
  await retainProjectionFailure(context, client, owner);
}

async function retainProjectionFailure(
  context: BulletinConfirmationContext,
  client: QueryClient,
  owner: OperationOwner
) {
  const projected = await refreshBulletinListProjection(client, context.refresh, () => context.gate.isCurrent(owner));
  if (context.gate.isCurrent(owner) && !projected) {
    context.gate.setRecovery(owner, { stage: 'projection', operation: owner.operation, failure: 'error' });
  }
}
