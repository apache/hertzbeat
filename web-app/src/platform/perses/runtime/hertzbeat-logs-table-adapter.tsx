/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type KeyboardEvent,
  type DragEvent,
  type MouseEvent,
  type CSSProperties,
  type ReactNode
} from 'react';
import { Dropdown, type MenuProps } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';
import {
  interactiveSelector,
  logIndex,
  resolveRovingIndex,
  decorateRow,
  formatVisibleTimestamp,
  setRovingFocus,
  moveLogRowFocus
} from './hertzbeat-log-row-dom';
import {
  decorateLogColumns,
  resetLogColumns,
  logColumnGrid,
  logColumnMinimumWidth,
  type HertzBeatLogColumn
} from './hertzbeat-log-columns';
import type { LogArrival } from '@/shared/log-arrival';
import { animateLogArrival } from './hertzbeat-log-arrival';
import { highlightLogMessages } from './hertzbeat-log-message-highlight';
import styles from './hertzbeat-logs-table-adapter.module.css';

export type HertzBeatLogRowSelection = {
  timeZone?: string | undefined;
  columns?: HertzBeatLogColumn[] | undefined;
  ariaLabel: string;
  columnLabels?: { time: string; severity: string; service?: string; message: string } | undefined;
  showTime?: boolean | undefined;
  rowHeight?: 'small' | 'medium' | 'large' | undefined;
  contentDisplay?: 'message' | 'attributes' | 'stack' | undefined;
  showContent?: boolean | undefined;
  standardizeHeaders?: boolean | undefined;
  controlsId: string;
  selectedIndex?: number | undefined;
  getAriaLabel: (index: number) => string;
  getServiceLabel?: ((index: number) => string | undefined) | undefined;
  messageSearch?: string | undefined;
  getArrival?: ((index: number) => LogArrival | undefined) | undefined;
  getSeverityLabel?: ((index: number) => string | undefined) | undefined;
  onSelect: (index: number, row: HTMLElement) => void;
};

type LogAdapterProps =
  | HertzBeatLogRowSelection
  | {
      columns?: HertzBeatLogColumn[] | undefined;
      timeZone?: string | undefined;
      ariaLabel: string;
      onSelect?: never;
      controlsId?: never;
      columnLabels?: never;
      showTime?: boolean | undefined;
      rowHeight?: 'small' | 'medium' | 'large' | undefined;
      contentDisplay?: 'message' | 'attributes' | 'stack' | undefined;
      showContent?: boolean | undefined;
      standardizeHeaders?: boolean | undefined;
      selectedIndex?: never;
      getAriaLabel?: never;
      getArrival?: never;
      getSeverityLabel?: never;
      getServiceLabel?: never;
      messageSearch?: never;
    };
type HeaderReorderProps = {
  onColumnMove?: ((columnId: string, direction: 'left' | 'right') => void) | undefined;
  onColumnDrop?: ((sourceId: string, targetId: string, after: boolean) => void) | undefined;
  reorderHint?: string | undefined;
};

export function HertzBeatLogsTableAdapter(props: LogAdapterProps & HeaderReorderProps & { children: ReactNode }) {
  const { children, columnLabels, showTime = true, ariaLabel, onSelect } = props;
  const visibleColumns = props.columns?.filter(
    column =>
      (props.showContent !== false || column.kind !== 'message') && (props.showTime !== false || column.kind !== 'time')
  );
  const draggedColumn = useRef<string>();
  const { rootRef, rovingIndexRef } = useLogRowMetadata(props);
  const selectFromTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element) || target.closest(interactiveSelector)) return;
    const row = target.closest<HTMLElement>('[data-log-index]');
    const index = row ? logIndex(row) : undefined;
    if (row && index != null && onSelect) {
      rovingIndexRef.current = index;
      setRovingFocus(rootRef.current, row);
      onSelect(index, row);
    }
  };

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest(interactiveSelector)) {
      event.stopPropagation();
      return;
    }
    selectFromTarget(event.target);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('[data-log-index]')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectFromTarget(target);
      return;
    }
    const index = moveLogRowFocus(rootRef.current, target, event.key);
    if (index == null) return;
    event.preventDefault();
    rovingIndexRef.current = index;
  };

  return (
    <div
      ref={rootRef}
      className={styles.adapter}
      style={
        visibleColumns
          ? ({ '--hb-log-columns-min-width': `${logColumnMinimumWidth(visibleColumns)}px` } as CSSProperties)
          : undefined
      }
      data-custom-columns={props.columns ? 'true' : undefined}
      role={onSelect ? 'grid' : 'table'}
      aria-label={ariaLabel}
      aria-multiselectable={onSelect ? false : undefined}
      onMouseDownCapture={event => {
        if (event.target instanceof Element && event.target.closest(interactiveSelector)) event.stopPropagation();
      }}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {props.columns ? (
        <div className={styles.columns} role="row" style={{ gridTemplateColumns: logColumnGrid(visibleColumns ?? []) }}>
          {(visibleColumns ?? []).map((column, index) => (
            <LogColumnHeader
              key={column.id}
              column={column}
              index={index}
              draggedColumnRef={draggedColumn}
              onMove={props.onColumnMove}
              onDrop={props.onColumnDrop}
              reorderHint={props.reorderHint}
            />
          ))}
        </div>
      ) : (
        columnLabels && <LogColumns labels={columnLabels} showTime={showTime} />
      )}
      <div className={styles.table}>{children}</div>
    </div>
  );
}

function LogColumnHeader({
  column,
  index,
  draggedColumnRef,
  onMove,
  onDrop,
  reorderHint
}: {
  column: HertzBeatLogColumn;
  index: number;
  draggedColumnRef: MutableRefObject<string | undefined>;
  onMove: HeaderReorderProps['onColumnMove'];
  onDrop: HeaderReorderProps['onColumnDrop'];
  reorderHint: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const canMove = Boolean(column.reorderable && onMove);
  const canOpenActions = canMove || Boolean(column.actions);
  return (
    <span
      role="columnheader"
      aria-colindex={index + 1}
      aria-sort={column.ariaSort}
      aria-description={column.reorderable ? reorderHint : undefined}
      tabIndex={canOpenActions ? 0 : undefined}
      draggable={Boolean(column.reorderable && (onMove || onDrop))}
      onDragStart={event => startColumnDrag(event, column, draggedColumnRef, onMove, onDrop)}
      onDragOver={event => allowColumnDrop(event, column, draggedColumnRef, onDrop)}
      onDrop={event => dropColumn(event, column, draggedColumnRef, onDrop)}
      onDragEnd={() => {
        draggedColumnRef.current = undefined;
      }}
      onContextMenu={event => openHeaderMenu(event, canOpenActions, setOpen)}
      onKeyDown={event => handleHeaderMenuKey(event, canOpenActions, setOpen)}
    >
      {column.header ?? column.label}
      {column.actions && (
        <Dropdown
          trigger={['click']}
          open={open}
          onOpenChange={setOpen}
          autoFocus
          menu={{ items: columnMenuItems(column.actions), onClick: ({ key }) => column.actions?.onAction(key) }}
        >
          <button type="button" aria-label={column.actions.menuLabel} title={column.actions.menuLabel}>
            <EllipsisOutlined aria-hidden="true" />
          </button>
        </Dropdown>
      )}
    </span>
  );
}

function columnMenuItems(actions: NonNullable<HertzBeatLogColumn['actions']>): NonNullable<MenuProps['items']> {
  return [
    ...(actions.showCalculate ? [{ key: 'calculate-field', label: actions.calculateField }] : []),
    ...(actions.showMove
      ? [
          { key: 'move-left', label: actions.moveLeft, disabled: actions.moveLeftDisabled },
          { key: 'move-right', label: actions.moveRight, disabled: actions.moveRightDisabled }
        ]
      : []),
    ...(actions.showCalculate || actions.showMove ? [{ type: 'divider' as const }] : []),
    {
      key: 'insert-left',
      label: actions.insertLeft,
      disabled: actions.insertLeftDisabled,
      popupClassName: styles.columnSubmenu,
      children: actions.insertOptions.map(option => ({ key: `insert-left:${option.id}`, label: option.label }))
    },
    {
      key: 'insert-right',
      label: actions.insertRight,
      disabled: actions.insertRightDisabled,
      popupClassName: styles.columnSubmenu,
      children: actions.insertOptions.map(option => ({ key: `insert-right:${option.id}`, label: option.label }))
    },
    {
      key: 'replace',
      label: actions.replace,
      disabled: actions.replaceDisabled,
      popupClassName: styles.columnSubmenu,
      children: actions.replaceOptions.map(option => ({ key: `replace:${option.id}`, label: option.label }))
    },
    { type: 'divider' },
    { key: 'remove', label: actions.remove, disabled: actions.removeDisabled }
  ];
}

function startColumnDrag(
  event: DragEvent<HTMLSpanElement>,
  column: HertzBeatLogColumn,
  draggedColumnRef: MutableRefObject<string | undefined>,
  onMove: HeaderReorderProps['onColumnMove'],
  onDrop: HeaderReorderProps['onColumnDrop']
) {
  if (!column.reorderable || (!onMove && !onDrop)) return;
  draggedColumnRef.current = column.id;
  event.dataTransfer?.setData('text/plain', column.id);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function allowColumnDrop(
  event: DragEvent<HTMLSpanElement>,
  column: HertzBeatLogColumn,
  draggedColumnRef: MutableRefObject<string | undefined>,
  onDrop: HeaderReorderProps['onColumnDrop']
) {
  if (draggedColumnRef.current && column.reorderable && onDrop) event.preventDefault();
}

function dropColumn(
  event: DragEvent<HTMLSpanElement>,
  column: HertzBeatLogColumn,
  draggedColumnRef: MutableRefObject<string | undefined>,
  onDrop: HeaderReorderProps['onColumnDrop']
) {
  event.preventDefault();
  const source = draggedColumnRef.current ?? event.dataTransfer?.getData('text/plain');
  draggedColumnRef.current = undefined;
  if (!source || source === column.id || !column.reorderable || !onDrop) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  onDrop(source, column.id, event.clientX >= bounds.left + bounds.width / 2);
}

function openHeaderMenu(event: MouseEvent<HTMLSpanElement>, canMove: boolean, setOpen: (open: boolean) => void) {
  if (!canMove) return;
  event.preventDefault();
  setOpen(true);
}

function handleHeaderMenuKey(
  event: KeyboardEvent<HTMLSpanElement>,
  canMove: boolean,
  setOpen: (open: boolean) => void
) {
  if (!canMove || (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10'))) return;
  event.preventDefault();
  setOpen(true);
}

function LogColumns({
  labels,
  showTime
}: {
  labels: NonNullable<HertzBeatLogRowSelection['columnLabels']>;
  showTime: boolean;
}) {
  return (
    <div className={styles.columns} role="row" data-show-time={showTime} data-show-service={labels.service != null}>
      {showTime && (
        <span role="columnheader" aria-colindex={1}>
          {labels.time}
        </span>
      )}
      <span role="columnheader" aria-colindex={showTime ? 2 : 1}>
        {labels.severity}
      </span>
      {labels.service && (
        <span role="columnheader" aria-colindex={showTime ? 3 : 2}>
          {labels.service}
        </span>
      )}
      <span role="columnheader" aria-colindex={Number(showTime) + Number(labels.service != null) + 2}>
        {labels.message}
      </span>
    </div>
  );
}

function useLogRowMetadata({
  columns,
  timeZone,
  controlsId,
  selectedIndex,
  getAriaLabel,
  getSeverityLabel,
  getServiceLabel,
  getArrival,
  messageSearch,
  showTime = true,
  rowHeight = 'small',
  showContent = true
}: LogAdapterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const clearHighlights = useRef<() => void>(() => {});
  const rovingIndexRef = useRef<number | undefined>(selectedIndex);

  const synchronizeRows = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-log-index]'));
    const rovingIndex = resolveRovingIndex(rows, selectedIndex, rovingIndexRef.current);
    rovingIndexRef.current = rovingIndex;
    for (const row of rows) {
      const index = logIndex(row);
      if (index == null) continue;
      formatVisibleTimestamp(row.querySelector('time'), timeZone);
      if (!columns) resetLogColumns(row);
      if (controlsId && getAriaLabel)
        decorateRow(row, index, index === rovingIndex, selectedIndex === index, {
          controlsId,
          ariaLabel: getAriaLabel(index),
          severityLabel: getSeverityLabel?.(index),
          serviceLabel: getServiceLabel?.(index),
          showService: getServiceLabel != null,
          showTime
        });
      else row.setAttribute('role', 'row');
      if (columns) decorateLogColumns(row, index, columns, rowHeight, showContent, showTime);
      animateLogArrival(row, getArrival?.(index));
    }
    clearHighlights.current();
    clearHighlights.current = highlightLogMessages(root, messageSearch);
  }, [
    columns,
    timeZone,
    controlsId,
    getAriaLabel,
    getSeverityLabel,
    getServiceLabel,
    getArrival,
    messageSearch,
    selectedIndex,
    showTime,
    rowHeight,
    showContent
  ]);

  useEffect(() => {
    synchronizeRows();
    const root = rootRef.current;
    if (!root) return undefined;
    return observeLogRows(root, synchronizeRows, () => clearHighlights.current());
  }, [synchronizeRows]);

  return { rootRef, rovingIndexRef };
}

function observeLogRows(root: HTMLElement, synchronizeRows: () => void, clearHighlights: () => void) {
  const observer = new MutationObserver(synchronizeRows);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['data-log-index', 'datetime'],
    childList: true,
    characterData: true,
    subtree: true
  });
  return () => {
    observer.disconnect();
    clearHighlights();
  };
}
