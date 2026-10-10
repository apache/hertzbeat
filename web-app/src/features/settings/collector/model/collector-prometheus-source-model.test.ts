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

import { describe, expect, it } from 'vitest';

import {
  applyPrometheusTarget,
  cancelPrometheusTarget,
  managedPrometheusLimits,
  removePrometheusTarget,
  selectPrometheusTarget,
  type ManagedPrometheusSourceView,
  type ManagedPrometheusTargetDraft
} from './collector-prometheus-source-model';

const first = target('first');
const second = target('second');

describe('collector Prometheus source model', () => {
  it('replaces the selected target without changing list order', () => {
    const selected = selectPrometheusTarget(view([first, second]), 0);
    const replacement = target('replacement');

    expect(selected && applyPrometheusTarget(selected, replacement)).toEqual(view([replacement, second]));
  });

  it('appends a new target and clears the selection', () => {
    const selected = selectPrometheusTarget(view([first]), 'new');

    expect(selected && applyPrometheusTarget(selected, second)).toEqual(view([first, second]));
  });

  it('removes only the requested target and clears the selection', () => {
    expect(removePrometheusTarget({ targets: [first, second], selection: 1 }, 0)).toEqual(view([second]));
  });

  it('cancels a target edit without changing drafts', () => {
    expect(cancelPrometheusTarget({ targets: [first], selection: 0 })).toEqual(view([first]));
  });

  it('rejects adding a target once the maximum is reached', () => {
    const targets = Array.from({ length: managedPrometheusLimits.targets }, (_, index) => target(`target-${index}`));

    expect(selectPrometheusTarget(view(targets), 'new')).toBeNull();
  });

  it('rejects applying an out-of-range numeric selection', () => {
    expect(applyPrometheusTarget({ targets: [first], selection: 3 }, second)).toBeNull();
  });
});

function view(targets: readonly ManagedPrometheusTargetDraft[]): ManagedPrometheusSourceView {
  return { targets, selection: null };
}

function target(name: string): ManagedPrometheusTargetDraft {
  return {
    name,
    endpoint: `https://${name}.example.test/metrics`,
    intervalSeconds: 30,
    timeoutSeconds: 10,
    headerSecretRefs: [],
    tlsCaProfile: ''
  };
}
