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

import type { NoticeTemplateCommand } from './notice-template-command-state';

export type NoticeTemplateOperationOwner = {
  command: Exclude<NoticeTemplateCommand, 'idle'>;
  epoch: number;
};

/** Owns synchronous command admission and retires stale async completions. */
export function useNoticeTemplateOperationController() {
  const epochRef = useRef(0);
  const ownerRef = useRef<NoticeTemplateOperationOwner | null>(null);
  const [command, setCommand] = useState<NoticeTemplateCommand>('idle');
  useEffect(
    () => () => {
      epochRef.current += 1;
      ownerRef.current = null;
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
  const beginDetail = () => {
    if (ownerRef.current && ownerRef.current.command !== 'loading-detail') return null;
    return replace('loading-detail');
  };
  const beginCommand = (next: 'saving' | 'deleting') => {
    // React state commits later; the ref closes same-tick duplicate admission.
    if (ownerRef.current) return null;
    return replace(next);
  };
  const isCurrent = (owner: NoticeTemplateOperationOwner) =>
    ownerRef.current === owner && epochRef.current === owner.epoch;
  const isLocked = () => ownerRef.current !== null;
  const end = (owner: NoticeTemplateOperationOwner) => {
    if (!isCurrent(owner)) return;
    ownerRef.current = null;
    setCommand('idle');
  };
  const supersedeDetail = () => {
    if (ownerRef.current && ownerRef.current.command !== 'loading-detail') return false;
    epochRef.current += 1;
    ownerRef.current = null;
    setCommand('idle');
    return true;
  };
  return { beginCommand, beginDetail, command, end, isCurrent, isLocked, supersedeDetail };
}

export type NoticeTemplateOperationController = ReturnType<typeof useNoticeTemplateOperationController>;
