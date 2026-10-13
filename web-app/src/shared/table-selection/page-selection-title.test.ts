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

import { describe, expect, it } from 'vitest';

import { pageSelectionLabels, pageSelectionTitleCheckboxProps } from './page-selection-title';

const labels = {
  selectAll: 'Select all items on this page',
  clearAll: 'Clear all selected items on this page'
};

describe('page selection title checkbox props', () => {
  it('owns the shared runtime translation keys', () => {
    expect(pageSelectionLabels(key => key)).toEqual({
      selectAll: 'common.tableSelection.selectAll',
      clearAll: 'common.tableSelection.clearAll'
    });
  });

  it('offers to select the current page when no rows are selected', () => {
    expect(pageSelectionTitleCheckboxProps([], [7, 8], labels)).toEqual({
      'aria-label': labels.selectAll
    });
  });

  it('offers to clear the current page when every selectable row is selected', () => {
    expect(pageSelectionTitleCheckboxProps([7, 8], [7, 8], labels)).toEqual({
      'aria-label': labels.clearAll
    });
  });

  it('keeps the select-all name for a partial selection and ignores off-page keys', () => {
    expect(pageSelectionTitleCheckboxProps([7, 99], [7, 8], labels)).toEqual({
      'aria-label': labels.selectAll
    });
  });

  it('does not describe an empty page as fully selected', () => {
    expect(pageSelectionTitleCheckboxProps([], [], labels)).toEqual({
      'aria-label': labels.selectAll
    });
  });
});
