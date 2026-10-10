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

import { EditorView } from '@codemirror/view';
import type { LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';
export const STRUCTURED_LOG_INPUT_SELECTOR =
  ':is([data-log-search-syntax="structured-v1"], [data-log-search-syntax="structured-v2"]) [data-log-search-input]';

export function focusLogSyntaxDiagnostic(
  region: HTMLElement | null,
  diagnostic: LogSyntaxDiagnostic | undefined,
  source: 'a' | 'b' = 'a'
) {
  if (!diagnostic) return false;
  const input = region
    ?.closest('[data-explore-query-layout]')
    ?.querySelector<HTMLElement>(`[data-log-comparison-source="${source}"] ${STRUCTURED_LOG_INPUT_SELECTOR}`);
  const editor = input && EditorView.findFromDOM(input);
  if (!editor || editor.state.doc.toString() !== diagnostic.expression) return false;
  editor.focus();
  editor.dispatch({ selection: { anchor: diagnostic.start, head: diagnostic.end } });
  return true;
}
