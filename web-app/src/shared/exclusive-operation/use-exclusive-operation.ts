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

import { useEffect, useRef, useState } from 'react';

type OperationOwner = symbol;

/** Serializes a command and retires its async callbacks when the owner unmounts. */
export function useExclusiveOperation(scope: string) {
  const mountedRef = useRef(true);
  const ownerRef = useRef<OperationOwner | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const begin = (): OperationOwner | undefined => {
    if (!mountedRef.current || ownerRef.current) return undefined;
    const owner = Symbol(scope);
    ownerRef.current = owner;
    setPending(true);
    return owner;
  };
  const isCurrent = (owner: OperationOwner) => mountedRef.current && ownerRef.current === owner;
  const end = (owner: OperationOwner) => {
    if (!isCurrent(owner)) return;
    ownerRef.current = undefined;
    setPending(false);
  };
  const retire = (owner: OperationOwner) => {
    if (!isCurrent(owner)) return false;
    ownerRef.current = undefined;
    setPending(false);
    return true;
  };
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ownerRef.current = undefined;
    };
  }, []);
  return { begin, end, retire, isCurrent, isLocked: () => ownerRef.current !== undefined, pending };
}

export type ExclusiveOperation = ReturnType<typeof useExclusiveOperation>;
