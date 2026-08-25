/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
