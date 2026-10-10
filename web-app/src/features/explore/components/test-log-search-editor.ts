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

import { act } from '@testing-library/react';
import { EditorView } from '@codemirror/view';

export function logSearchView(element: HTMLElement) {
  const view = EditorView.findFromDOM(element);
  if (!view) throw new Error('Expected a CodeMirror log search editor');
  return view;
}

export function setLogSearchText(element: HTMLElement, text: string) {
  const view = logSearchView(element);
  act(() =>
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      selection: { anchor: text.length }
    })
  );
}

export function logSearchText(element: HTMLElement) {
  return logSearchView(element).state.doc.toString();
}
