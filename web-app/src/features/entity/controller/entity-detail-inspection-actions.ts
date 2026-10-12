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

import {
  buildEntityExplorePath,
  buildEntityTopologyPath,
  type EntityExploreSignal
} from '../model/entity-operational-navigation';
import { buildEntitySignalHandoffPath, type EntitySignalViewState } from '../model/entity-signal-view-model';
import type { EntityDetailEvidence } from '../model/entity-view-model';

export function buildEntityInspectionActions(
  evidence: EntityDetailEvidence,
  signals: EntitySignalViewState | undefined,
  returnTo: string | null,
  navigate: (path: string) => void
) {
  return {
    explore: (signal: EntityExploreSignal) => {
      if (signals?.kind === 'ready' && signals.capabilities[signal] === 'available') {
        navigate(buildEntitySignalHandoffPath(signals.plan, signal));
        return;
      }
      if (evidence.kind !== 'ready') return;
      navigate(buildEntityExplorePath(evidence.detail, signal));
    },
    topology: () => {
      if (evidence.kind !== 'ready') return;
      const path = buildEntityTopologyPath(evidence.detail, returnTo);
      navigate(signals?.kind === 'ready' ? withExactWindow(path, signals.plan.anchor.window) : path);
    }
  };
}

function withExactWindow(path: string, window: { from: number; to: number }) {
  const url = new URL(path, 'https://hertzbeat.local');
  url.searchParams.set('start', String(window.from));
  url.searchParams.set('end', String(window.to));
  return `${url.pathname}?${url.searchParams.toString()}`;
}
