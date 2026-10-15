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

import type { TableRowSelection } from 'antd/es/table/interface';

import { pageSelectionTitleCheckboxProps, type PageSelectionLabels } from '@/shared/table-selection';

import type { AlertCenterActionPolicy } from '../model/alert-capability-model';
import type { AlertGroup } from '../model/alert-model';

export function alertCenterRowSelection(
  actionPolicy: AlertCenterActionPolicy,
  busy: boolean,
  records: AlertGroup[],
  selectedIds: number[],
  onSelectIds: (ids: number[]) => void,
  selectionLabels: PageSelectionLabels
): TableRowSelection<AlertGroup> | undefined {
  if (!actionPolicy.canSelect) return undefined;
  return {
    selectedRowKeys: selectedIds,
    getTitleCheckboxProps: () =>
      pageSelectionTitleCheckboxProps(
        selectedIds,
        records.map(record => record.id),
        selectionLabels
      ),
    getCheckboxProps: () => ({ disabled: busy }),
    onChange: keys => onSelectIds(keys.flatMap(key => (typeof key === 'number' ? [key] : [])))
  };
}
