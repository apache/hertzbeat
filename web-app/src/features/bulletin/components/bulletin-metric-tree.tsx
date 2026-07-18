/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Tree } from 'antd';
import type { Key } from 'react';

import {
  fieldsFromMetricTreeKeys,
  resolveSavedMetricTreeSelection,
  type BulletinMetricTreeMetricNode
} from '../model/bulletin-metric-tree-model';
import type { BulletinFields } from '../model/bulletin-model';
import styles from './bulletin-metric-tree.module.css';

export function BulletinMetricTree({ fields, tree, onChange }: {
  fields: BulletinFields;
  tree: BulletinMetricTreeMetricNode[];
  onChange: (fields: BulletinFields) => void;
}) {
  const checkedKeys = resolveSavedMetricTreeSelection(tree, fields).checkedKeys;
  const handleCheck = (keys: Key[] | { checked: Key[] }) => {
    const checked = Array.isArray(keys) ? keys : keys.checked;
    onChange(fieldsFromMetricTreeKeys(tree, checked.map(String)));
  };

  return <div className={styles.metricTree}>
    <Tree
      blockNode
      checkable
      checkedKeys={checkedKeys}
      defaultExpandAll
      onCheck={handleCheck}
      treeData={tree}
    />
  </div>;
}
