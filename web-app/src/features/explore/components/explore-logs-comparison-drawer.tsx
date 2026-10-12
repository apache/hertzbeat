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

import { Button, Drawer } from 'antd';
import type { TFunction } from 'i18next';
import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { DEFAULT_LOG_ANALYSIS, validLogAnalysis } from '@/platform/perses';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import type { ExploreSubmissionViewModel, LogExploreSubmissionDraft } from '../model/explore-submission-model';
import { ExploreLogComparisonEditor } from './explore-log-comparison-editor';
import type { LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';

type Props = {
  draft: LogExploreSubmissionDraft;
  updateField: ExploreSubmissionViewModel['updateField'];
  close: () => void;
  diagnostic?: LogSyntaxDiagnostic | undefined;
  t: TFunction;
};

export function ExploreLogsComparisonDrawer({ draft, updateField, close, diagnostic, t }: Props) {
  const [raw, setRaw] = useState(() => initialComparisonDraft(draft));
  const [recovered, setRecovered] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const valid = validLogAnalysis(raw);
  const malformedOriginal = draft.logAnalysis !== undefined && readLogAnalysisDraft(draft.logAnalysis) === undefined;
  const needsReset = malformedOriginal && !recovered;
  useEffect(() => {
    if (!diagnostic) return;
    const input = editor.current?.querySelector<HTMLInputElement>(
      '[data-log-comparison-source="b"] input[data-log-search-input]'
    );
    if (!input) return;
    input.focus();
    if (input.value === diagnostic.expression) input.setSelectionRange(diagnostic.start, diagnostic.end);
  }, [diagnostic, needsReset]);
  return (
    <Drawer
      open
      width={680}
      title={t('explore.logComparison.label')}
      onClose={close}
      footer={
        <>
          <Button onClick={close}>{t('common.cancel')}</Button>
          <Button
            type="primary"
            disabled={needsReset || !valid}
            onClick={() => {
              updateField({ field: 'logAnalysis', value: raw });
              close();
            }}
          >
            {t('common.confirm')}
          </Button>
        </>
      }
    >
      <ComparisonDrawerBody {...{ draft, raw, setRaw, needsReset, valid, setRecovered, editor, t }} />
    </Drawer>
  );
}

function ComparisonDrawerBody({
  draft,
  raw,
  setRaw,
  needsReset,
  valid,
  setRecovered,
  editor,
  t
}: {
  draft: LogExploreSubmissionDraft;
  raw: string;
  setRaw: Dispatch<SetStateAction<string>>;
  needsReset: boolean;
  valid: boolean;
  setRecovered: Dispatch<SetStateAction<boolean>>;
  editor: RefObject<HTMLDivElement>;
  t: TFunction;
}) {
  return (
    <>
      {!needsReset && (
        <div ref={editor}>
          <ExploreLogComparisonEditor
            draft={{ ...draft, logAnalysis: raw }}
            updateField={update => {
              if (update.field === 'logAnalysis') setRaw(update.value);
            }}
            allowInvalidLocalDraft
            t={t}
          />
        </div>
      )}
      {!valid && (
        <p role="alert">
          {t('explore.logAnalysis.invalid')}{' '}
          {needsReset && (
            <Button
              onClick={() => {
                setRaw(initialComparisonDraft({ ...draft, logAnalysis: undefined }));
                setRecovered(true);
              }}
            >
              {t('explore.logAnalysis.reset')}
            </Button>
          )}
        </p>
      )}
    </>
  );
}

function initialComparisonDraft(draft: LogExploreSubmissionDraft) {
  const parsed = readLogAnalysisDraft(draft.logAnalysis);
  if (draft.logAnalysis !== undefined && !parsed) return draft.logAnalysis;
  const analysis = parsed ?? DEFAULT_LOG_ANALYSIS;
  if (analysis.comparison) return JSON.stringify(analysis);
  return JSON.stringify({
    ...analysis,
    representation: analysis.representation === 'timeseries' ? 'timeseries' : 'table',
    comparison: {
      version: 1,
      search: draft.query,
      ...(draft.searchSyntax === 'structured-v1' ? { searchSyntax: draft.searchSyntax } : {})
    }
  });
}
