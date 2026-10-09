/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Tree, type TreeDataNode } from 'antd';
import { useTranslation } from 'react-i18next';
import type { LogInspectorAnalysisControls } from '../model/explore-log-inspector-analysis';
import type { LogColumnControls } from '../model/explore-log-columns';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import type { JsonValue, LogRow } from '../model/explore-signal-contract';
import { makeNodes, walk, typeLabel, highlight, type Node } from './explore-log-inspector-tree';
import type { InspectorField } from './explore-log-inspector-model';
import { unsupportedFieldFilter } from './explore-log-inspector-unsupported-filter';
import { LogFieldMenu } from './explore-log-field-menu';
import { InspectorValue } from './explore-log-inspector-value';
import styles from './explore-log-inspector-fields.module.css';

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

function fieldMap(fields: InspectorField[]) {
  const map = new Map<string, InspectorField>();
  for (const field of fields) {
    if (!field.path) continue;
    const key = JSON.stringify(field.path);
    if (!map.get(key)?.column || field.column) map.set(key, field);
  }
  return map;
}

function renderNode(
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
