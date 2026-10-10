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

import { useLayoutEffect, useRef } from 'react';
import { useNavigate, useSearchParams, type NavigateFunction } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { parseHertzBeatDashboardDocument, type HertzBeatDashboardDocument } from '@/platform/perses';
import { buildSignalDashboardPath } from '@/shared/navigation/signal-dashboard-paths';
import type { useSourceScopedValue } from '@/shared/query-context';
import { appendDashboardPanel, blankDashboard, copyDashboard } from '../model/signal-dashboard-authoring';
import { readSignalDashboard } from '../model/signal-dashboard-record';
import {
  buildDashboardViewPath,
  selectDashboardViewPath,
  type readDashboardViewQuery
} from '../model/signal-dashboard-view-query';
import type { DashboardViewActions } from '../model/signal-dashboard-view-model';
import type { useSignalDashboardCatalog } from './use-signal-dashboard-catalog';
import type { useSignalDashboardEditor } from './use-signal-dashboard-editor';
import type { useSignalDashboardTime } from './use-signal-dashboard-time';
import type { useSignalDashboardHandoff } from './use-signal-dashboard-handoff';

type Options = {
  source: string;
  query: ReturnType<typeof readDashboardViewQuery>;
  catalog: ReturnType<typeof useSignalDashboardCatalog>;
  editor: ReturnType<typeof useSignalDashboardEditor>;
  preview: ReturnType<typeof useSourceScopedValue<HertzBeatDashboardDocument | undefined>>;
  localError: ReturnType<typeof useSourceScopedValue<string | undefined>>;
  time: ReturnType<typeof useSignalDashboardTime>;
  handoff: ReturnType<typeof useSignalDashboardHandoff>;
  read: ReturnType<typeof readSignalDashboard> | undefined;
  document: HertzBeatDashboardDocument | undefined;
  t: TFunction;
};

export function useSignalDashboardActions(options: Options): DashboardViewActions {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { editor, preview, localError, handoff, time } = options;
  const authority = useRef(Symbol());
  useLayoutEffect(() => {
    authority.current = Symbol();
    return () => {
      authority.current = Symbol();
    };
  }, [options.source, editor.draft]);
  const cancel = () => {
    editor.cancel();
    preview.setValue(undefined);
    localError.setValue(undefined);
  };
  return {
    open: key => {
      if (!editor.busy) {
        cancel();
        handoff.dismiss();
        void navigate(buildSignalDashboardPath(key));
      }
    },
    begin: mode => beginEditor(options, mode),
    update: editor.update,
    cancel,
    save: editor.save,
    remove: editor.remove,
    controls: time.setControls,
    refresh: time.refresh,
    refreshDirectory: () => {
      void options.catalog.refresh();
    },
    dismissIncoming: handoff.dismiss,
    reload: async () => {
      const visit = authority.current;
      const key = editor.draft?.document.metadata.name ?? options.query.key;
      const result = await options.catalog.refresh();
      if (result.error || authority.current !== visit) return;
      cancel();
      void navigate(key ? selectDashboardViewPath(params, key) : buildSignalDashboardPath());
    },
    query: () => {
      if (!options.document) return;
      try {
        const document = parseHertzBeatDashboardDocument(options.document);
        time.commit();
        preview.setValue(document);
        localError.setValue(undefined);
      } catch {
        localError.setValue('invalidDocument');
      }
    },
    importDocument: (text, asCopy) => importDocument(options, text, asCopy),
    receive: key => receivePanel(options, key, navigate)
  };
}

function beginEditor({ editor, read, t, localError, preview }: Options, mode: 'new' | 'edit' | 'copy' | 'upgrade') {
  if (!editor.canWrite || editor.busy) return;
  localError.setValue(undefined);
  preview.setValue(undefined);
  if (mode === 'new') {
    editor.begin({ mode, document: blankDashboard(crypto.randomUUID(), t('signalDashboard.untitled')) });
    return;
  }
  if (!read || read.kind === 'unavailable' || !read.document) return;
  if (mode === 'copy')
    editor.begin({
      mode,
      document: copyDashboard(
        read.document,
        crypto.randomUUID(),
        t('signalDashboard.copyName', { name: read.document.spec.display.name })
      )
    });
  else editor.begin({ mode, document: structuredClone(read.document), original: read.original });
}

function importDocument({ editor, localError, t, preview }: Options, text: string, asCopy: boolean) {
  if (!editor.canWrite || editor.busy) return false;
  try {
    const imported = parseHertzBeatDashboardDocument(JSON.parse(text));
    const document = asCopy
      ? copyDashboard(
          imported,
          crypto.randomUUID(),
          t('signalDashboard.copyName', { name: imported.spec.display.name })
        )
      : imported;
    editor.begin({ mode: 'import', document });
    preview.setValue(undefined);
    localError.setValue(undefined);
    return true;
  } catch {
    localError.setValue('invalidDocument');
    return false;
  }
}

function newIncomingTarget(source: HertzBeatDashboardDocument) {
  const target = copyDashboard(source, crypto.randomUUID(), source.spec.display.name);
  target.spec.panels = {};
  target.spec.variables = [];
  target.spec.layouts[0].spec.items = [];
  return target;
}

function receivePanel(options: Options, key: string | undefined, navigate: NavigateFunction) {
  const { editor, preview, localError, handoff } = options;

  if (!editor.canWrite || editor.busy) return;
  try {
    const incoming = handoff.incoming;
    if (!incoming) return;
    const original = options.catalog.query.data?.find(record => record.dashboardKey === key);
    const read = original ? readSignalDashboard(original) : undefined;
    if (original && read?.kind !== 'document') throw new Error('Unsupported target');
    const target = read?.kind === 'document' ? read.document : newIncomingTarget(incoming.document);
    const document = appendDashboardPanel(
      target,
      incoming.document,
      crypto.randomUUID(),
      Object.keys(incoming.document.spec.panels)[0]!
    );
    editor.begin({ mode: 'append', document, original });
    preview.setValue(document);
    handoff.dismiss();
    void navigate(
      buildDashboardViewPath(
        options.query.key,
        {},
        new URLSearchParams(incoming.returnTo.split('?')[1]).get('timeZone')!,
        { window: incoming.timeWindow }
      ),
      { replace: true }
    );
  } catch {
    localError.setValue('invalidHandoff');
  }
}
