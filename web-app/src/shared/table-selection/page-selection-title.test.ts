/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
