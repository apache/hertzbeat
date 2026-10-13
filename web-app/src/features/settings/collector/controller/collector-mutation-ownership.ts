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
