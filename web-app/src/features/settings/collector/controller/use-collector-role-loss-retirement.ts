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

import { useEffect, useRef } from 'react';

import type { CollectorActionCapabilities } from '../model/collector-action-capability';
import type { useCollectorFileLogSourceController } from './use-collector-file-log-source-controller';
import type { useCollectorIntakeController } from './use-collector-intake-controller';
import type { useCollectorMutationController } from './use-collector-mutation-controller';
import type { useCollectorPrometheusSourceController } from './use-collector-prometheus-source-controller';
import type { useCollectorRuntimeConfigController } from './use-collector-runtime-config-controller';

type Options = {
  capabilities: CollectorActionCapabilities;
  mutation: ReturnType<typeof useCollectorMutationController>;
  intake: ReturnType<typeof useCollectorIntakeController>;
  runtime: ReturnType<typeof useCollectorRuntimeConfigController>;
  prometheus: ReturnType<typeof useCollectorPrometheusSourceController>;
  fileLog: ReturnType<typeof useCollectorFileLogSourceController>;
};

export function useCollectorRoleLossRetirement(options: Options) {
  const previousRef = useRef(options.capabilities);
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = options.capabilities;
    const lostWrite = previous.canWrite && !options.capabilities.canWrite;
    const lostDelete = previous.canDelete && !options.capabilities.canDelete;
    if (!lostWrite && !lostDelete) return;

    options.mutation.retireUnauthorized(options.capabilities);
    if (lostWrite) {
      options.intake.retire();
      options.prometheus.retire();
      options.fileLog.retire();
      options.runtime.retire();
    } else {
      options.intake.retire();
    }
  }, [options]);
}
