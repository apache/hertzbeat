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

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export type MonitorMetricLayoutCommandOwner = Readonly<{
  application: string;
  epoch: number;
}>;

export function useMonitorMetricLayoutCommandOwner(application: string | undefined) {
  const [source, setSource] = useState({ application, epoch: 0 });
  let currentSource = source;
  if (source.application !== application) {
    currentSource = { application, epoch: source.epoch + 1 };
    setSource(currentSource);
  }
  const currentOwner = application ? { application, epoch: currentSource.epoch } : null;
  const activeOwnerRef = useRef<MonitorMetricLayoutCommandOwner | null>(null);
  const currentOwnerRef = useRef<MonitorMetricLayoutCommandOwner | null>(currentOwner);
  const [activeOwner, setActiveOwner] = useState<MonitorMetricLayoutCommandOwner | null>(null);
  const commands = useOwnerCommands(currentOwnerRef);

  useLayoutEffect(() => {
    currentOwnerRef.current = currentOwner;
    if (activeOwnerRef.current && !sameOwner(activeOwnerRef.current, currentOwner)) {
      activeOwnerRef.current = null;
    }
  });

  const isCurrent = (owner: MonitorMetricLayoutCommandOwner) =>
    sameOwner(owner, currentOwnerRef.current) && sameOwner(owner, activeOwnerRef.current);
  const beginEdit = () => {
    if (!currentOwner) return false;
    activeOwnerRef.current = currentOwner;
    setActiveOwner(currentOwner);
    return true;
  };
  const cancelEdit = () => {
    activeOwnerRef.current = null;
    setActiveOwner(null);
  };
  const clearEdit = (owner: MonitorMetricLayoutCommandOwner) => {
    if (!isCurrent(owner)) return false;
    cancelEdit();
    return true;
  };
  return {
    activeOwner,
    currentOwner,
    editing: sameOwner(activeOwner, currentOwner),
    saving: currentOwner ? commands.pendingKeys.has(ownerKey(currentOwner)) : false,
    beginEdit,
    cancelEdit,
    clearEdit,
    isCurrent,
    beginCommand: commands.beginCommand,
    endCommand: commands.endCommand
  };
}

function useOwnerCommands(currentOwnerRef: RefObject<MonitorMetricLayoutCommandOwner | null>) {
  const pendingKeysRef = useRef<Set<string>>(new Set());
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(new Set());
  const beginCommand = (owner: MonitorMetricLayoutCommandOwner) => {
    const key = ownerKey(owner);
    if (!sameOwner(owner, currentOwnerRef.current) || pendingKeysRef.current.has(key)) return false;
    pendingKeysRef.current = new Set(pendingKeysRef.current).add(key);
    setPendingKeys(pendingKeysRef.current);
    return true;
  };
  const endCommand = (owner: MonitorMetricLayoutCommandOwner) => {
    const key = ownerKey(owner);
    if (!pendingKeysRef.current.has(key)) return;
    const next = new Set(pendingKeysRef.current);
    next.delete(key);
    pendingKeysRef.current = next;
    setPendingKeys(next);
  };
  return { pendingKeys, beginCommand, endCommand };
}

function ownerKey(owner: MonitorMetricLayoutCommandOwner) {
  return `${owner.epoch}:${owner.application}`;
}

function sameOwner(left: MonitorMetricLayoutCommandOwner | null, right: MonitorMetricLayoutCommandOwner | null) {
  return Boolean(left && right && left.application === right.application && left.epoch === right.epoch);
}
