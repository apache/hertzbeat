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

import apiSource from './alert-silence-api.ts?raw';
import editorSource from './alert-silence-editor.tsx?raw';
import modelSource from './alert-silence-model.ts?raw';
import pageSource from './alert-silence-page.tsx?raw';
import scheduleSource from './alert-silence-schedule-fields.tsx?raw';
import schemaSource from './alert-silence-schema.ts?raw';
import writeModelSource from './alert-silence-write-model.ts?raw';
import controllerSource from './controller/use-alert-silence-controller.ts?raw';
import pageModelSource from './alert-silence-page-model.ts?raw';
import mutationsSource from './controller/use-alert-silence-mutations.ts?raw';
import operationGateSource from './controller/use-alert-silence-operation-gate.ts?raw';

function sourceLineCount(value: string) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('//')).length;
}

describe('AlertSilencePage architecture', () => {
  it('keeps transport paths and response parsing in the API boundary', () => {
    expect(apiSource).toContain("from './alert-silence-schema'");
    expect(apiSource).toContain('function buildAlertSilenceListPath');
    expect(modelSource).not.toMatch(/export function parseAlertSilence/);
    expect(modelSource).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
    expect(modelSource).not.toContain('/api/alert/silences');
    expect(schemaSource).not.toMatch(/Date\.parse\s*\(/);
    expect(modelSource).toContain("from './alert-silence-write-model'");
    expect(sourceLineCount(modelSource)).toBeLessThanOrEqual(250);
    expect(sourceLineCount(writeModelSource)).toBeLessThanOrEqual(250);
  });

  it('keeps TanStack, transport, Router state, and notifications in the controller', () => {
    expect(pageSource).not.toMatch(/@tanstack\/react-query|alert-silence-api|useSearchParams|App\.useApp/);
    expect(pageSource).toMatch(/useAlertSilenceController/);
  });

  it('owns Router state once and does not compress state transitions to meet line limits', () => {
    expect(controllerSource.match(/useSearchParams\(/g)).toHaveLength(1);
    expect(controllerSource).not.toMatch(/;[^\S\r\n]*setBusy\(/);
    expect(controllerSource).not.toMatch(/useState<AlertSilenceDraft/);
    expect(controllerSource).toContain("from './use-alert-silence-mutations'");
    expect(pageModelSource).toContain("| { kind: 'loading'; id: number }");
    expect(pageModelSource).toContain('| { kind: AlertSilenceDetailFailure; id: number }');
    expect(sourceLineCount(controllerSource)).toBeLessThanOrEqual(200);
    expect(sourceLineCount(mutationsSource)).toBeLessThanOrEqual(200);
  });

  it('keeps the local operation gate separate from silence transactions', () => {
    expect(mutationsSource).toContain('const gate = useAlertSilenceOperationGate()');
    expect(mutationsSource).toMatch(/saveAlertSilence[\s\S]*onCommitted[\s\S]*loadAlertSilence[\s\S]*rereadList\(\)/);
    expect(mutationsSource).toMatch(/updateAlertSilenceEnabled[\s\S]*loadAlertSilence[\s\S]*rereadList\(\)/);
    expect(mutationsSource).toMatch(/deleteAlertSilence[\s\S]*requireMissingSilence[\s\S]*rereadList\(\)/);
    expect(operationGateSource).toContain('const owner = useRef<number | null>(null)');
    expect(operationGateSource).toContain(
      'if (owner.current !== null || projectionFailureRef.current !== null) return'
    );
    expect(operationGateSource).toMatch(
      /await operation\.write\(\)[\s\S]*operation\.onCommitted\?\.\(\)[\s\S]*await operation\.verify\(\)/
    );
    expect(operationGateSource).toContain('if (!owns(commandOwner, owner, mounted)) return');
    expect(operationGateSource).not.toMatch(
      /saveAlertSilence|loadAlertSilence|updateAlertSilenceEnabled|deleteAlertSilence|rereadList/
    );
    expect(sourceLineCount(operationGateSource)).toBeLessThanOrEqual(200);
  });

  it('keeps schedule normalization in the model and splits the two presentation windows', () => {
    expect(editorSource).toContain("from './alert-silence-schedule-fields'");
    expect(editorSource).not.toMatch(/DatePicker|TimePicker|Checkbox|Radio|changeAlertSilenceType/);
    expect(scheduleSource).toContain('function AlertSilenceOnceWindow');
    expect(scheduleSource).toContain('function AlertSilenceRecurringWindow');
    expect(scheduleSource).toContain('changeAlertSilenceType(draft, type)');
    expect(scheduleSource).toContain('const weekdayOrder = [7, 1, 2, 3, 4, 5, 6]');
    expect(scheduleSource).toContain('format="YYYY-MM-DD HH:mm"');
    expect(scheduleSource).toContain("format('YYYY-MM-DDTHH:mm')");
    expect(scheduleSource.match(/minuteStep=\{5\}/g)).toHaveLength(2);
    expect(scheduleSource).toContain('if (!range?.[0] || !range[1]) return');
    expect(scheduleSource).toContain("t('alertSilences.crossMidnightHelp')");
    expect(scheduleSource).not.toMatch(/controller|alert-silence-api|@tanstack\/react-query/);
  });
});
