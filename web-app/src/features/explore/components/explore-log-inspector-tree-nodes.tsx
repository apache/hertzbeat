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

import { type TreeDataNode } from 'antd';
import type { LogColumnControls } from '../model/explore-log-columns';
import type { LogInspectorAnalysisControls } from '../model/explore-log-inspector-analysis';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import type { LogRow } from '../model/explore-signal-contract';
import { LogFieldMenu } from './explore-log-field-menu';
import styles from './explore-log-inspector-fields.module.css';
import type { InspectorField } from './explore-log-inspector-model';
import { highlight, typeLabel, type Node } from './explore-log-inspector-tree';
import { unsupportedFieldFilter } from './explore-log-inspector-unsupported-filter';
import { InspectorValue } from './explore-log-inspector-value';

export function fieldMap(fields: InspectorField[]) {
  const map = new Map<string, InspectorField>();
  for (const field of fields) {
    if (!field.path) continue;
    const key = JSON.stringify(field.path);
    if (!map.get(key)?.column || field.column) map.set(key, field);
  }
  return map;
}

export function renderNode(
  node: Node,
  fields: Map<string, InspectorField>,
  matches: Set<string>,
  search: string,
  controls: LogInspectorFilterControls & LogInspectorAnalysisControls,
  row: LogRow,
  logColumns: LogColumnControls | undefined,
  allowCalculatedField: boolean
): TreeDataNode {
  const key = node.path.join('.');
  const raw = node.value;
  const field = fieldForNode(node, fields);
  const value = raw === '' ? '""' : raw === null || typeof raw !== 'object' ? String(raw) : '';
  return {
    key: node.key,
    title: (
      <span
        className={styles.treeRow}
        data-field={key}
        data-match={matches.has(node.key) || undefined}
        onClick={event => openLeafMenu(event, Boolean(node.children))}
      >
        <span className={styles.treeKey} title={key}>
          {highlight(node.path.at(-1) ?? '', search)}
        </span>
        <span className={styles.treeType}>{typeLabel(raw)}</span>
        {value && (
          <span className={styles.treeValue}>
            {value.length > 160 || value.includes('\n') ? (
              <InspectorValue fieldKey={key} value={raw as string} preview={highlight(value, search)} />
            ) : (
              <span className={styles.scalarValue} title={value}>
                {highlight(value, search)}
              </span>
            )}
          </span>
        )}
        <span className={styles.fieldActions} onClick={event => event.stopPropagation()}>
          <LogFieldMenu
            field={field}
            row={row}
            logColumns={logColumns}
            allowCalculatedField={allowCalculatedField}
            {...controls}
          />
        </span>
      </span>
    ),
    ...(node.children
      ? {
          children: node.children.map(child =>
            renderNode(child, fields, matches, search, controls, row, logColumns, allowCalculatedField)
          )
        }
      : {})
  };
}

function fieldForNode(node: Node, fields: Map<string, InspectorField>): InspectorField {
  const filter = fields.get(node.key)?.filter ?? unsupportedFieldFilter(node.path, node.value);
  return {
    ...fields.get(node.key),
    ...(filter ? { filter } : {}),
    key: node.path.join('.'),
    path: node.path,
    value: typeof node.value === 'string' ? node.value : JSON.stringify(node.value)
  };
}

function openLeafMenu(event: React.MouseEvent<HTMLSpanElement>, expandable: boolean) {
  if (expandable || (event.target as HTMLElement).closest('button, a, input')) return;
  event.stopPropagation();
  event.currentTarget.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')?.click();
}
