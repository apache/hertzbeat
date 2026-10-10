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

import { Tree } from 'antd';
import type { Key } from 'react';

import {
  fieldsFromMetricTreeKeys,
  resolveSavedMetricTreeSelection,
  type BulletinMetricTreeMetricNode
} from '../model/bulletin-metric-tree-model';
import type { BulletinFields } from '../model/bulletin-model';
import styles from './bulletin-metric-tree.module.css';

export function BulletinMetricTree({
  fields,
  tree,
  disabled,
  onChange
}: {
  fields: BulletinFields;
  tree: BulletinMetricTreeMetricNode[];
  disabled?: boolean;
  onChange: (fields: BulletinFields) => void;
}) {
  const checkedKeys = resolveSavedMetricTreeSelection(tree, fields).checkedKeys;
  const handleCheck = (keys: Key[] | { checked: Key[] }) => {
    const checked = Array.isArray(keys) ? keys : keys.checked;
    onChange(fieldsFromMetricTreeKeys(tree, checked.map(String)));
  };

  return (
    <div className={styles.metricTree}>
      <Tree
        blockNode
        checkable
        disabled={disabled ?? false}
        checkedKeys={checkedKeys}
        defaultExpandAll
        onCheck={handleCheck}
        treeData={tree}
      />
    </div>
  );
}
