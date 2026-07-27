/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { TableRowSelection } from 'antd/es/table/interface';

import type { AlertCenterActionPolicy } from '../model/alert-capability-model';
import type { AlertGroup } from '../model/alert-model';

export function alertCenterRowSelection(
  actionPolicy: AlertCenterActionPolicy,
  busy: boolean,
  selectedIds: number[],
  onSelectIds: (ids: number[]) => void
): TableRowSelection<AlertGroup> | undefined {
  if (!actionPolicy.canSelect) return undefined;
  return {
    selectedRowKeys: selectedIds,
    getCheckboxProps: () => ({ disabled: busy }),
    onChange: keys => onSelectIds(keys.flatMap(key => (typeof key === 'number' ? [key] : [])))
  };
}
