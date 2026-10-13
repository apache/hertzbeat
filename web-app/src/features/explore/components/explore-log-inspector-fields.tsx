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

import { Button, Input, Tree } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LogColumnControls } from '../model/explore-log-columns';
import type { LogInspectorAnalysisControls } from '../model/explore-log-inspector-analysis';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import type { JsonValue, LogRow } from '../model/explore-signal-contract';
import styles from './explore-log-inspector-fields.module.css';
import type { InspectorField } from './explore-log-inspector-model';
import { makeNodes, walk } from './explore-log-inspector-tree';

import { fieldMap, renderNode } from './explore-log-inspector-tree-nodes';

type Props = LogInspectorFilterControls &
  LogInspectorAnalysisControls & {
    logColumns?: LogColumnControls | undefined;
    fields: InspectorField[];
    row: LogRow;
    search: string;
    setSearch: (value: string) => void;
    matchIndex: number;
    setMatchIndex: (value: number) => void;
    allowCalculatedField?: boolean | undefined;
  };

function FieldSearch({
  search,
  setSearch,
  matchIndex,
  setMatchIndex,
  count
}: Pick<Props, 'search' | 'setSearch' | 'matchIndex' | 'setMatchIndex'> & { count: number }) {
  const { t } = useTranslation();
  return (
    <div className={styles.fieldSearch}>
      <Input
        aria-label={t('explore.perses.searchFields')}
        placeholder={t('explore.perses.searchFields')}
        value={search}
        onChange={event => {
          setSearch(event.target.value);
          setMatchIndex(0);
        }}
      />
      <span role="status" aria-label={t('explore.perses.fieldSearchMatches')} className={styles.matchCount}>
        {search ? `${count ? matchIndex + 1 : 0} / ${count}` : ''}
      </span>
      <Button
        aria-label={t('explore.perses.previousFieldMatch')}
        disabled={!count}
        onClick={() => setMatchIndex((matchIndex - 1 + count) % count)}
      >
        ↑
      </Button>
      <Button
        aria-label={t('explore.perses.nextFieldMatch')}
        disabled={!count}
        onClick={() => setMatchIndex((matchIndex + 1) % count)}
      >
        ↓
      </Button>
      <Button
        disabled={!search}
        onClick={() => {
          setSearch('');
          setMatchIndex(0);
        }}
      >
        {t('explore.perses.clearFieldSearch')}
      </Button>
    </div>
  );
}

export function InspectorFields({
  fields,
  row,
  logColumns,
  search,
  setSearch,
  matchIndex,
  setMatchIndex,
  allowCalculatedField = true,
  ...controls
}: Props) {
  const { t } = useTranslation();
  const nodes = useMemo(() => makeNodes(row as unknown as JsonValue), [row]);
  const all = useMemo(() => walk(nodes), [nodes]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[] | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const matches = search
    ? all.filter(node =>
        [node.path.at(-1), node.value !== null && typeof node.value === 'object' ? '' : String(node.value)]
          .join(' ')
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase())
      )
    : [];
  const currentIndex = matches.length ? matchIndex % matches.length : 0;
  const active = matches[currentIndex];
  useEffect(() => {
    if (active) treeRef.current?.querySelector('.ant-tree-node-selected')?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);
  const fieldByKey = useMemo(() => fieldMap(fields), [fields]);
  const ancestorKeys = matches.flatMap(node =>
    node.path.slice(1).map((_, index) => JSON.stringify(node.path.slice(0, index + 1)))
  );
  const matchKeys = new Set(matches.map(match => match.key));
  const visibleExpandedKeys = Array.from(
    new Set([...(expandedKeys ?? all.filter(node => node.children?.length).map(node => node.key)), ...ancestorKeys])
  );
  return (
    <>
      <FieldSearch {...{ search, setSearch, matchIndex: currentIndex, setMatchIndex, count: matches.length }} />
      {search && !matches.length && <p className={styles.emptyFields}>{t('explore.perses.noMatchingFields')}</p>}
      <div ref={treeRef}>
        <Tree
          className={styles.tree ?? ''}
          blockNode
          expandedKeys={visibleExpandedKeys}
          onExpand={keys => setExpandedKeys(keys)}
          selectedKeys={active ? [active.key] : []}
          onSelect={(_, info) => {
            const index = matches.findIndex(node => node.key === info.node.key);
            if (index >= 0) setMatchIndex(index);
          }}
          treeData={nodes.map(node =>
            renderNode(node, fieldByKey, matchKeys, search, controls, row, logColumns, allowCalculatedField)
          )}
        />
      </div>
    </>
  );
}
