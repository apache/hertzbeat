/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef } from 'react';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

export type StatusOperationOwner = NonNullable<ReturnType<ExclusiveOperation['begin']>>;

export function useStatusOperationScope(command: ExclusiveOperation) {
  const activeOwner = useRef<StatusOperationOwner | undefined>(undefined);
  const scopedCommand: ExclusiveOperation = {
    ...command,
    begin: () => {
      const owner = command.begin();
      if (owner) activeOwner.current = owner;
      return owner;
    },
    end: owner => {
      if (activeOwner.current === owner) activeOwner.current = undefined;
      command.end(owner);
    }
  };
  return {
    command: scopedCommand,
    retire: () => {
      const owner = activeOwner.current;
      if (!owner) return false;
      activeOwner.current = undefined;
      return command.retire(owner);
    }
  };
}

/** Freezes the submitted payload so Retry can prove the original write without issuing it again. */
export type StatusWriteReceipt<T> =
  | { kind: 'create'; value: T; editorEpoch: number; owner: StatusOperationOwner }
  | { kind: 'update'; value: T; editorEpoch: number; owner: StatusOperationOwner };

export type StatusWriteRecovery<T> = {
  stage: 'proof' | 'commit-uncertain';
  receipt: StatusWriteReceipt<T>;
};

export type StatusDeleteReceipt = {
  id: number;
  owner: StatusOperationOwner;
};
