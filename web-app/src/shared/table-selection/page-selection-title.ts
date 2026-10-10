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

import type { Key } from 'react';

export type PageSelectionLabels = {
  selectAll: string;
  clearAll: string;
};

type PageSelectionTranslationKey = 'common.tableSelection.selectAll' | 'common.tableSelection.clearAll';

export function pageSelectionLabels(translate: (key: PageSelectionTranslationKey) => string): PageSelectionLabels {
  return {
    selectAll: translate('common.tableSelection.selectAll'),
    clearAll: translate('common.tableSelection.clearAll')
  };
}

export function pageSelectionTitleCheckboxProps(
  selectedKeys: readonly Key[],
  selectableKeys: readonly Key[],
  labels: PageSelectionLabels
) {
  const selected = new Set(selectedKeys);
  const allSelectableRowsSelected =
    selectableKeys.length > 0 && selectableKeys.every(selectableKey => selected.has(selectableKey));

  return { 'aria-label': allSelectableRowsSelected ? labels.clearAll : labels.selectAll };
}
