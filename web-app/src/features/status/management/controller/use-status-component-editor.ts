/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef, useState } from 'react';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import type { StatusComponent } from '../model/status-management-contract';
import { createStatusComponentDraft } from '../model/status-management-model';

/** Owns component-editor identity so an old command cannot close a newer draft. */
export function useStatusComponentEditor(command: ExclusiveOperation) {
  const [component, setComponent] = useState<StatusComponent>();
  const epoch = useRef(0);

  const openNew = (orgId: number) => {
    const draft = createStatusComponentDraft(orgId);
    if (!draft || command.isLocked()) return;
    epoch.current += 1;
    setComponent(draft);
  };
  const edit = (value: StatusComponent) => {
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

  return { component, openNew, edit, close, complete, currentEpoch: () => epoch.current };
}
