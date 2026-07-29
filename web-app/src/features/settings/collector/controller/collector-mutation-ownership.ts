/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { CollectorMutationCommand } from '../model/collector-model';

export type CollectorMutationOperation = {
  generation: number;
  command: CollectorMutationCommand;
  abort: AbortController;
};

export function createCollectorMutationOwnership() {
  let generation = 0;
  let active: CollectorMutationOperation | null = null;
  return {
    begin(command: CollectorMutationCommand) {
      const operation = { generation: ++generation, command, abort: new AbortController() };
      active = operation;
      return operation;
    },
    owns(operation: CollectorMutationOperation) {
      return active === operation && operation.generation === generation && !operation.abort.signal.aborted;
    },
    complete(operation: CollectorMutationOperation) {
      if (active === operation) active = null;
    },
    retire() {
      // Network abort is best-effort; generation retirement is the publication boundary.
      generation += 1;
      active?.abort.abort();
      active = null;
    },
    activeAction() {
      return active?.command.action;
    },
    busy() {
      return active !== null;
    }
  };
}

export type CollectorMutationOwnership = ReturnType<typeof createCollectorMutationOwnership>;
