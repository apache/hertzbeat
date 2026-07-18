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

import contractSource from '../api/monitor-contract.ts?raw';
import controllerSource from './use-monitor-editor-controller.ts?raw';
import actionsSource from './monitor-editor-actions.ts?raw';
import commandsSource from './use-monitor-editor-commands.ts?raw';
import commandOperationSource from './monitor-editor-command-operation.ts?raw';
import draftSource from './use-monitor-editor-draft.ts?raw';
import queryKeysSource from './monitor-editor-query-keys.ts?raw';
import resourceModelSource from './monitor-editor-resource-model.ts?raw';
import resourcesSource from './use-monitor-editor-resources.ts?raw';
import routeSource from './use-monitor-editor-route.ts?raw';

describe('Monitor editor controller architecture', () => {
  it('keeps the route controller as composition rather than resource or command ownership', () => {
    expect(controllerSource).not.toMatch(/@tanstack\/react-query|\buseQuery\b/);
    expect(controllerSource).not.toMatch(/detectMonitor|saveMonitor|loadMonitor(?:Apps|Collectors|Detail|ParamDefines)/);
    expect(controllerSource).not.toMatch(/queryKey:\s*\[/);
    expect(controllerSource).toContain("from './use-monitor-editor-resources'");
    expect(controllerSource).toContain("from './use-monitor-editor-draft'");
    expect(controllerSource).toContain("from './use-monitor-editor-commands'");
  });

  it('owns all editor Query Keys in one factory', () => {
    expect(resourcesSource).toContain('monitorEditorQueryKeys');
    expect(resourcesSource).not.toMatch(/queryKey:\s*\[/);
    for (const key of ['apps', 'collectors', 'detail', 'appDefines', 'sdDefines']) {
      expect(queryKeysSource).toMatch(new RegExp(`\\b${key}\\b`));
    }
  });

  it('keeps scrape normalization and editor mode independent of route hooks', () => {
    for (const source of [actionsSource, commandsSource, resourceModelSource, resourcesSource]) {
      expect(source).not.toContain("from './use-monitor-editor-route'");
    }
    expect(contractSource).toContain('export type MonitorEditorMode');
    expect(contractSource).toContain('export function normalizeMonitorScrape');
    for (const source of [actionsSource, resourceModelSource, resourcesSource, routeSource]) {
      expect(source).toContain("from '../api/monitor-contract'");
    }
  });

  it('keeps every editor controller responsibility reviewable', () => {
    for (const source of [
      controllerSource,
      actionsSource,
      commandsSource,
      commandOperationSource,
      draftSource,
      queryKeysSource,
      resourceModelSource,
      resourcesSource,
      routeSource
    ]) {
      expect(sourceLineCount(source)).toBeLessThanOrEqual(200);
      expect(source).not.toMatch(/;[^\S\r\n]*(?:set|return|await|void)\b/);
    }
  });
});

function sourceLineCount(value: string) {
  return value.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('//')).length;
}
