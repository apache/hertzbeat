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

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Owns one asynchronous command at a time. The ref is intentional: React state
 * cannot reject two commands admitted in the same event-loop tick.
 */
export function useExclusiveOperation<T, R = never>() {
  const nextOwner = useRef(0);
  const currentOwner = useRef<number | null>(null);
  const recoveryRef = useRef<R | null>(null);
  const [activeValue, setActiveValue] = useState<T | null>(null);
  const [recovery, setRecovery] = useState<R | null>(null);

  useEffect(
    () => () => {
      currentOwner.current = null;
      recoveryRef.current = null;
    },
    []
  );

  const begin = useCallback((value: T) => {
    if (currentOwner.current !== null || recoveryRef.current !== null) return null;
    const owner = ++nextOwner.current;
    currentOwner.current = owner;
    setActiveValue(value);
    return owner;
  }, []);
  const beginRecovery = useCallback((value: T) => {
    if (currentOwner.current !== null || recoveryRef.current === null) return null;
    const owner = ++nextOwner.current;
    currentOwner.current = owner;
    setActiveValue(value);
    return { owner, recovery: recoveryRef.current };
  }, []);
  const isLocked = useCallback(() => currentOwner.current !== null || recoveryRef.current !== null, []);
  const isOwnedBy = useCallback((owner: number) => currentOwner.current === owner, []);
  const retainRecovery = useCallback((owner: number, next: R) => {
    if (currentOwner.current !== owner) return false;
    recoveryRef.current = next;
    setRecovery(next);
    return true;
  }, []);
  const clearRecovery = useCallback((owner: number) => {
    if (currentOwner.current !== owner) return false;
    recoveryRef.current = null;
    setRecovery(null);
    return true;
  }, []);
  const retire = useCallback((owner?: number) => {
    if (owner !== undefined && currentOwner.current !== owner) return false;
    currentOwner.current = null;
    setActiveValue(null);
    return true;
  }, []);

  return {
    activeValue,
    begin,
    beginRecovery,
    clearRecovery,
    isLocked,
    isOwnedBy,
    recovery,
    retainRecovery,
    retire
  };
}
