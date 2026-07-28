/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type RuntimeSourceOwner = 'prometheus' | 'fileLog';
export type RuntimeSourceCoordinator = {
  claim: (owner: RuntimeSourceOwner) => boolean;
  release: (owner: RuntimeSourceOwner) => void;
};

export function createRuntimeSourceCoordinator(): RuntimeSourceCoordinator {
  let current: RuntimeSourceOwner | null = null;
  return {
    claim: owner => {
      if (current) return false;
      current = owner;
      return true;
    },
    release: owner => {
      if (current === owner) current = null;
    }
  };
}
