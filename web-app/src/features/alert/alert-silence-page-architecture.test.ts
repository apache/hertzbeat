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
import modelSource from './alert-silence-model.ts?raw';
import pageSource from './alert-silence-page.tsx?raw';
import schemaSource from './alert-silence-schema.ts?raw';
import controllerSource from './controller/use-alert-silence-controller.ts?raw';

describe('AlertSilencePage architecture', () => {
  it('keeps transport paths and response parsing in the API boundary', () => {
    expect(apiSource).toContain("from './alert-silence-schema'");
    expect(apiSource).toContain('export function buildAlertSilenceListPath');
    expect(modelSource).not.toMatch(/export function parseAlertSilence/);
    expect(modelSource).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
    expect(modelSource).not.toContain('/api/alert/silences');
    expect(schemaSource).not.toMatch(/Date\.parse\s*\(/);
  });

  it('keeps TanStack, transport, Router state, and notifications in the controller', () => {
    expect(pageSource).not.toMatch(/@tanstack\/react-query|alert-silence-api|useSearchParams|App\.useApp/);
    expect(pageSource).toMatch(/useAlertSilenceController/);
  });

  it('owns Router state once and does not compress state transitions to meet line limits', () => {
    expect(controllerSource.match(/useSearchParams\(/g)).toHaveLength(1);
    expect(controllerSource).not.toMatch(/;[^\S\r\n]*setBusy\(/);
  });
});
