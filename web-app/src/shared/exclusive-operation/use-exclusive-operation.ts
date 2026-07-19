/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';

type OperationOwner = { token: symbol };

/** Serializes a command and retires its async callbacks when the owner unmounts. */
export function useExclusiveOperation(scope: string) {
  const mountedRef = useRef(true);
  const ownerRef = useRef<OperationOwner | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const begin = () => {
    if (!mountedRef.current || ownerRef.current) return undefined;
    const owner = { token: Symbol(scope) };
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
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ownerRef.current = undefined;
    };
  }, []);
  return { begin, end, isCurrent, isLocked: () => ownerRef.current !== undefined, pending };
}

export type ExclusiveOperation = ReturnType<typeof useExclusiveOperation>;
