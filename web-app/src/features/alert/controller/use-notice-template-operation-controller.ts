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

import type { NoticeTemplateCommand, NoticeTemplateRecovery } from './notice-template-command-state';

export type NoticeTemplateOperationOwner = {
  command: Exclude<NoticeTemplateCommand, 'idle'>;
  epoch: number;
};

type MutableCell<T> = { current: T };

function admitDetail(
  ownerRef: MutableCell<NoticeTemplateOperationOwner | null>,
  recoveryRef: MutableCell<NoticeTemplateRecovery | null>,
  replace: (command: NoticeTemplateOperationOwner['command']) => NoticeTemplateOperationOwner
) {
  if (recoveryRef.current || (ownerRef.current && ownerRef.current.command !== 'loading-detail')) return null;
  return replace('loading-detail');
}

function admitCommand(
  command: 'saving' | 'deleting',
  ownerRef: MutableCell<NoticeTemplateOperationOwner | null>,
  recoveryRef: MutableCell<NoticeTemplateRecovery | null>,
  replace: (command: NoticeTemplateOperationOwner['command']) => NoticeTemplateOperationOwner
) {
  // React state commits later; the ref closes same-tick duplicate admission.
  if (ownerRef.current || recoveryRef.current) return null;
  return replace(command);
}

function admitRecovery(
  ownerRef: MutableCell<NoticeTemplateOperationOwner | null>,
  recoveryRef: MutableCell<NoticeTemplateRecovery | null>,
  replace: (command: NoticeTemplateOperationOwner['command']) => NoticeTemplateOperationOwner
) {
  const recovery = recoveryRef.current;
  if (ownerRef.current || !recovery || recovery.stage === 'commit-uncertain') return null;
  return { owner: replace('recovering'), recovery };
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

/** Owns synchronous command admission and retires stale async completions. */
export function useNoticeTemplateOperationController() {
  const epochRef = useRef(0);
  const ownerRef = useRef<NoticeTemplateOperationOwner | null>(null);
  const recoveryRef = useRef<NoticeTemplateRecovery | null>(null);
  const [command, setCommand] = useState<NoticeTemplateCommand>('idle');
  const [recovery, setRecoveryState] = useState<NoticeTemplateRecovery | null>(null);
  useEffect(
    () => () => {
      epochRef.current += 1;
      ownerRef.current = null;
      recoveryRef.current = null;
    },
    []
  );
  const replace = (next: NoticeTemplateOperationOwner['command']) => {
    const owner = { command: next, epoch: epochRef.current + 1 };
    epochRef.current = owner.epoch;
    ownerRef.current = owner;
    setCommand(next);
    return owner;
  };
  const beginDetail = () => admitDetail(ownerRef, recoveryRef, replace);
  const beginCommand = (next: 'saving' | 'deleting') => admitCommand(next, ownerRef, recoveryRef, replace);
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
  return {
    beginCommand,
    beginDetail,
    beginRecovery,
    clearRecovery,
    command,
    end,
    isCurrent,
    isLocked,
    recovery,
    setRecovery,
    supersedeDetail
  };
}

export type NoticeTemplateOperationController = ReturnType<typeof useNoticeTemplateOperationController>;
