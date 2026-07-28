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

import { useEffect, useRef, useState } from 'react';

import type { NoticeTemplateCommand, NoticeTemplateRecovery } from '../model/notice-template-command-state';
import type {
  NoticeTemplateActionCapabilities,
  NoticeTemplateActionKind
} from '../model/notice-template-action-capability';
import { canPerformNoticeTemplateAction } from '../model/notice-template-action-capability';
import { canRetainNoticeTemplateRecovery, noticeTemplateRecoveryAction } from './notice-template-action-admission';

export type NoticeTemplateOperationOwner = {
  action: NoticeTemplateActionKind;
  command: Exclude<NoticeTemplateCommand, 'idle'>;
  epoch: number;
};

type MutableCell<T> = { current: T };

type NoticeTemplateOperationState = {
  epochRef: MutableCell<number>;
  ownerRef: MutableCell<NoticeTemplateOperationOwner | null>;
  recoveryRef: MutableCell<NoticeTemplateRecovery | null>;
  setCommand: (command: NoticeTemplateCommand) => void;
  setRecovery: (recovery: NoticeTemplateRecovery | null) => void;
};

function admitDetail(
  ownerRef: MutableCell<NoticeTemplateOperationOwner | null>,
  recoveryRef: MutableCell<NoticeTemplateRecovery | null>,
  replace: (
    command: NoticeTemplateOperationOwner['command'],
    action: NoticeTemplateActionKind
  ) => NoticeTemplateOperationOwner
) {
  if (recoveryRef.current || (ownerRef.current && ownerRef.current.command !== 'loading-detail')) return null;
  return replace('loading-detail', 'edit');
}

function admitCommand(
  command: 'saving' | 'deleting',
  action: NoticeTemplateActionKind,
  ownerRef: MutableCell<NoticeTemplateOperationOwner | null>,
  recoveryRef: MutableCell<NoticeTemplateRecovery | null>,
  replace: (
    command: NoticeTemplateOperationOwner['command'],
    action: NoticeTemplateActionKind
  ) => NoticeTemplateOperationOwner
) {
  // React state commits later; the ref closes same-tick duplicate admission.
  if (ownerRef.current || recoveryRef.current) return null;
  return replace(command, action);
}

function admitRecovery(
  ownerRef: MutableCell<NoticeTemplateOperationOwner | null>,
  recoveryRef: MutableCell<NoticeTemplateRecovery | null>,
  replace: (
    command: NoticeTemplateOperationOwner['command'],
    action: NoticeTemplateActionKind
  ) => NoticeTemplateOperationOwner
) {
  const recovery = recoveryRef.current;
  if (ownerRef.current || !recovery || recovery.stage === 'commit-uncertain') return null;
  const action = noticeTemplateRecoveryAction(recovery);
  if (!action) return null;
  return { owner: replace('recovering', action), recovery };
}

function publishRecovery(
  owner: NoticeTemplateOperationOwner,
  recovery: NoticeTemplateRecovery | null,
  recoveryRef: MutableCell<NoticeTemplateRecovery | null>,
  setRecoveryState: (recovery: NoticeTemplateRecovery | null) => void,
  isCurrent: (owner: NoticeTemplateOperationOwner) => boolean
) {
  if (!isCurrent(owner)) return false;
  recoveryRef.current = recovery;
  setRecoveryState(recovery);
  return true;
}

function retireUnauthorizedOperation(
  state: NoticeTemplateOperationState,
  capabilities: NoticeTemplateActionCapabilities
) {
  const ownsUnauthorizedOperation =
    state.ownerRef.current !== null && !canRetainOperationOwner(capabilities, state.ownerRef.current);
  const retainsUnauthorizedRecovery =
    state.recoveryRef.current !== null && !canRetainNoticeTemplateRecovery(capabilities, state.recoveryRef.current);
  if (!ownsUnauthorizedOperation && !retainsUnauthorizedRecovery) return false;
  state.epochRef.current += 1;
  state.ownerRef.current = null;
  state.recoveryRef.current = null;
  state.setCommand('idle');
  state.setRecovery(null);
  return true;
}

function canRetainOperationOwner(
  capabilities: NoticeTemplateActionCapabilities,
  owner: NoticeTemplateOperationOwner | null
) {
  return owner !== null && canPerformNoticeTemplateAction(capabilities, owner.action);
}

function useRetireNoticeTemplateOperationOnUnmount(
  epochRef: MutableCell<number>,
  ownerRef: MutableCell<NoticeTemplateOperationOwner | null>,
  recoveryRef: MutableCell<NoticeTemplateRecovery | null>
) {
  useEffect(
    () => () => {
      epochRef.current += 1;
      ownerRef.current = null;
      recoveryRef.current = null;
    },
    [epochRef, ownerRef, recoveryRef]
  );
}

/** Owns synchronous command admission and retires stale async completions. */
export function useNoticeTemplateOperationController() {
  const epochRef = useRef(0);
  const ownerRef = useRef<NoticeTemplateOperationOwner | null>(null);
  const recoveryRef = useRef<NoticeTemplateRecovery | null>(null);
  const [command, setCommand] = useState<NoticeTemplateCommand>('idle');
  const [recovery, setRecoveryState] = useState<NoticeTemplateRecovery | null>(null);
  useRetireNoticeTemplateOperationOnUnmount(epochRef, ownerRef, recoveryRef);
  const replace = (next: NoticeTemplateOperationOwner['command'], action: NoticeTemplateActionKind) => {
    const owner = { action, command: next, epoch: epochRef.current + 1 };
    epochRef.current = owner.epoch;
    ownerRef.current = owner;
    setCommand(next);
    return owner;
  };
  const beginDetail = () => admitDetail(ownerRef, recoveryRef, replace);
  const beginCommand = (next: 'saving' | 'deleting', action: NoticeTemplateActionKind) =>
    admitCommand(next, action, ownerRef, recoveryRef, replace);
  const beginRecovery = () => admitRecovery(ownerRef, recoveryRef, replace);
  const isCurrent = (owner: NoticeTemplateOperationOwner) =>
    ownerRef.current === owner && epochRef.current === owner.epoch;
  const isLocked = () => ownerRef.current !== null || recoveryRef.current !== null;
  const end = (owner: NoticeTemplateOperationOwner) => {
    if (!isCurrent(owner)) return;
    ownerRef.current = null;
    setCommand('idle');
  };
  const supersedeDetail = () => {
    if (recoveryRef.current || (ownerRef.current && ownerRef.current.command !== 'loading-detail')) return false;
    epochRef.current += 1;
    ownerRef.current = null;
    setCommand('idle');
    return true;
  };
  const clearRecovery = (owner: NoticeTemplateOperationOwner) =>
    publishRecovery(owner, null, recoveryRef, setRecoveryState, isCurrent);
  const setRecovery = (owner: NoticeTemplateOperationOwner, next: NoticeTemplateRecovery) =>
    publishRecovery(owner, next, recoveryRef, setRecoveryState, isCurrent);
  const retireUnauthorized = (capabilities: NoticeTemplateActionCapabilities) =>
    retireUnauthorizedOperation(
      { epochRef, ownerRef, recoveryRef, setCommand, setRecovery: setRecoveryState },
      capabilities
    );
  return {
    beginCommand,
    beginDetail,
    beginRecovery,
    canRetainActiveOperation: (capabilities: NoticeTemplateActionCapabilities) =>
      canRetainOperationOwner(capabilities, ownerRef.current),
    clearRecovery,
    command,
    end,
    isCurrent,
    isLocked,
    recovery,
    retireUnauthorized,
    retainedRecovery: () => recoveryRef.current,
    setRecovery,
    supersedeDetail
  };
}

export type NoticeTemplateOperationController = ReturnType<typeof useNoticeTemplateOperationController>;
