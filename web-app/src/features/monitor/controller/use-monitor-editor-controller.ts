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

import { App } from 'antd';
import { useTranslation } from 'react-i18next';

import { monitorScrapeValues } from '../api/monitor-api';
import type { MonitorEditorMode } from '../api/monitor-contract';
import { createMonitorEditorActions } from './monitor-editor-actions';
import { useMonitorEditorCommands } from './use-monitor-editor-commands';
import { useMonitorEditorDraft } from './use-monitor-editor-draft';
import { useMonitorEditorResources } from './use-monitor-editor-resources';
import {
  useCanonicalMonitorEditorUrl,
  useMonitorEditorRoute
} from './use-monitor-editor-route';

export type { MonitorEditorEvidence } from './use-monitor-editor-resources';

export function useMonitorEditorController(mode: MonitorEditorMode) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const route = useMonitorEditorRoute(mode);
  const resources = useMonitorEditorResources({
    mode,
    id: route.id,
    validRoute: route.validRoute,
    requestedApp: route.requestedApp,
    requestedScrape: route.requestedScrape,
    rawScrape: route.rawScrape
  });
  const draftState = useMonitorEditorDraft(
    resources.source,
    resources.canonicalDraft,
    resources.defines,
    resources.scrape
  );
  useCanonicalMonitorEditorUrl({
    validRoute: route.validRoute,
    apps: resources.appEvidence,
    mode,
    requestedApp: route.requestedApp,
    rawScrape: route.rawScrape,
    detail: resources.detail,
    carrySource: draftState.carrySource,
    source: resources.source,
    searchParams: route.searchParams,
    pathname: route.pathname,
    navigate: route.navigate
  });
  const commands = useMonitorEditorCommands({
    mode,
    id: route.id,
    source: resources.source,
    draft: draftState.draft,
    before: resources.detail,
    defines: resources.defines,
    returnTo: route.returnTo,
    navigate: route.navigate,
    message,
    text: {
      validation: t('monitor.editor.validation'),
      detectSuccess: t('monitor.editor.detectSuccess'),
      detectFailed: t('monitor.editor.detectFailed'),
      saveSuccess: t('monitor.editor.saveSuccess'),
      saveFailed: t('monitor.editor.saveFailed')
    }
  });

  const actions = createMonitorEditorActions({
    mode,
    id: route.id,
    app: resources.app,
    draft: draftState.draft,
    searchParams: route.searchParams,
    pathname: route.pathname,
    navigate: route.navigate,
    updateDraft: draftState.update,
    prepareTransition: draftState.prepareTransition,
    detect: commands.detect,
    save: commands.save,
    cancel: commands.cancel,
    retry: resources.retry
  });

  return {
    state: {
      evidence: resources.evidence,
      draft: draftState.draft,
      defines: resources.defines,
      apps: resources.apps,
      collectors: resources.collectors,
      busy: commands.command !== 'idle',
      command: commands.command,
      validationIssues: commands.validationIssues,
      returnTo: route.returnTo,
      scrapeValues: monitorScrapeValues,
      sourceKey: resources.source
    },
    actions
  };
}
