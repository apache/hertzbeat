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

import { useState } from 'react';

import type { MonitorParamDefine, MonitorScrape } from '../model/monitor-contract';
import { monitorEditorDraftIsDirty } from '../model/monitor-editor-dirty';
import { transitionMonitorEditorDraft } from '../model/monitor-editor-draft';
import type { MonitorEditorDraft } from '../model/monitor-editor-model';

type CarryDraft = {
  source: string;
  draft: MonitorEditorDraft;
  defines: MonitorParamDefine[];
};

export function useMonitorEditorDraft(
  source: string,
  canonical: MonitorEditorDraft | undefined,
  defines: MonitorParamDefine[],
  scrape: MonitorScrape
) {
  const [drafts, setDrafts] = useState<Record<string, MonitorEditorDraft>>({});
  const [baselines, setBaselines] = useState<
    Record<string, { draft: MonitorEditorDraft; defines: MonitorParamDefine[] }>
  >({});
  const [carry, setCarry] = useState<CarryDraft | null>(null);
  const transitioned =
    carry?.source === source && canonical
      ? transitionMonitorEditorDraft(carry.draft, carry.defines, defines, scrape)
      : undefined;
  const draft = drafts[source] ?? transitioned ?? canonical;

  const update = (updater: (value: MonitorEditorDraft) => MonitorEditorDraft) => {
    if (!draft) return;
    if (canonical)
      setBaselines(current => (current[source] ? current : { ...current, [source]: { draft: canonical, defines } }));
    // Functional state is required: structured fields can report validity and
    // value changes in either order during the same React event.
    setDrafts(current => ({
      ...current,
      [source]: updater(current[source] ?? draft)
    }));
  };

  const prepareTransition = (target: string) => {
    if (draft) setCarry({ source: target, draft, defines });
  };

  const baseline = baselines[source] ?? { draft: canonical, defines };
  // A source switch retains drafts; leaving the workspace loses every retained source.
  const dirty =
    Boolean(draft && baseline.draft && monitorEditorDraftIsDirty(draft, baseline.draft, baseline.defines)) ||
    Object.entries(drafts).some(([key, value]) => {
      const original = baselines[key];
      return original && monitorEditorDraftIsDirty(value, original.draft, original.defines);
    });
  return {
    dirty,
    carrySource: carry?.source,
    draft,
    prepareTransition,
    update
  };
}
