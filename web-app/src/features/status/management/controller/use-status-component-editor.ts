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
  const retire = () => {
    epoch.current += 1;
    setComponent(undefined);
  };

  return { component, openNew, edit, close, complete, retire, currentEpoch: () => epoch.current };
}
