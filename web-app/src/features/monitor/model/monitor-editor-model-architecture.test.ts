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

import { describe, expect, it } from 'vitest';

import formSource from '../components/monitor-editor-form-view.tsx?raw';
import paramFieldSource from '../components/monitor-param-field.tsx?raw';
import commandsSource from '../controller/use-monitor-editor-commands.ts?raw';
import convergenceSource from './monitor-editor-convergence.ts?raw';
import draftSource from './monitor-editor-draft.ts?raw';
import coreSource from './monitor-editor-model.ts?raw';
import payloadSource from './monitor-editor-payload.ts?raw';
import validationSource from './monitor-editor-validation.ts?raw';
import codecSource from './monitor-param-codec.ts?raw';

describe('Monitor editor model architecture', () => {
  it('keeps the core model limited to shared draft types and errors', () => {
    expect(coreSource).not.toMatch(/export function/);
    expect(coreSource).not.toMatch(/JSON\.parse|JSON\.stringify|CronExpression|buildMonitorPayload|transitionMonitorEditorDraft/);
  });

  it('assigns each editor behavior to one named owner', () => {
    for (const name of ['monitorParamFormValue', 'serializeMonitorParamValue', 'numberDefineRange']) {
      expect(codecSource).toMatch(new RegExp(`export function ${name}\\b`));
    }
    for (const name of ['buildMonitorParams', 'createMonitorEditorDraft', 'transitionMonitorEditorDraft',
      'groupMonitorParamDefines', 'isMonitorParamVisible']) {
      expect(draftSource).toMatch(new RegExp(`export function ${name}\\b`));
    }
    for (const name of ['validateMonitorDraft', 'validateMonitorEditorDraft', 'monitorIntervalBounds',
      'isValidCronExpression']) {
      expect(validationSource).toMatch(new RegExp(`export function ${name}\\b`));
    }
    expect(payloadSource).toContain('export function buildMonitorPayload');
    expect(payloadSource).toContain('export type MonitorMutationPayload');
  });

  it('makes consumers depend on the actual behavior owner', () => {
    expect(commandsSource).toContain("from '../model/monitor-editor-payload'");
    expect(commandsSource).toContain("from '../model/monitor-editor-validation'");
    expect(convergenceSource).toContain("from './monitor-editor-payload'");
    expect(paramFieldSource).toContain("from '../model/monitor-param-codec'");
    expect(formSource).toContain("from '../model/monitor-editor-draft'");
    expect(formSource).toContain("from '../model/monitor-editor-validation'");
  });

  it('owns the legacy discovery instance sentinel once in the core domain model', () => {
    expect(coreSource).toContain("export const MONITOR_DISCOVERY_INSTANCE = 'unknow'");
    for (const source of [draftSource, payloadSource]) {
      expect(source).toContain('MONITOR_DISCOVERY_INSTANCE');
      expect(source).not.toMatch(/['"]unknow['"]/);
    }
    expect([coreSource, draftSource, payloadSource].join('\n').match(/['"]unknow['"]/g)).toHaveLength(1);
  });

  it('keeps every production model within the reviewable source limit', () => {
    for (const source of [coreSource, codecSource, draftSource, validationSource, payloadSource]) {
      expect(sourceLineCount(source)).toBeLessThanOrEqual(250);
    }
  });
});

function sourceLineCount(value: string) {
  return value.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('//')).length;
}
