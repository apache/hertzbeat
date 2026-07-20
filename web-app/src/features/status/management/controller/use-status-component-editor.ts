/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef, useState } from 'react';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import type { StatusComponent } from '../model/status-management-contract';

/** Owns component-editor identity so an old command cannot close a newer draft. */
export function useStatusComponentEditor(command: ExclusiveOperation) {
  const [component, setComponent] = useState<Partial<StatusComponent>>();
  const epoch = useRef(0);

  const open = (value: Partial<StatusComponent>) => {
    if (command.isLocked()) return;
    epoch.current += 1;
    setComponent(value);
  };
  const close = () => {
    if (command.isLocked()) return;
    epoch.current += 1;
    setComponent(undefined);
  };
  const complete = (expectedEpoch: number) => {
    if (epoch.current === expectedEpoch) setComponent(undefined);
  };

  return { component, open, close, complete, currentEpoch: () => epoch.current };
}
