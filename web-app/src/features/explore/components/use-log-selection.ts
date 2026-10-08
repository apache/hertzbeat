/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogInspectorAnalysisControls } from '../model/explore-log-inspector-analysis';
import { useCallback, useMemo, useRef, useState } from 'react';
import { orderHertzBeatLogRowsForPerses } from '@/platform/perses';
import type { LogRow } from '../model/explore-signal-contract';
export function useLogSelection(
  rows: LogRow[],
  runtimeIdentity: string,
  evidenceCurrent: boolean,
  sort: 'newest' | 'oldest' | 'preserve',
  onSelectionChange?: () => void,
  retainLiveSnapshot?: boolean
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const orderedRows = useMemo(
    () => (sort === 'preserve' ? rows : orderHertzBeatLogRowsForPerses(rows, sort)),
    [rows, sort]
  );
  const [selection, setSelection] = useState<{ identity: string; row: LogRow; at: number }>();
  const currentSelection =
    selection?.identity === runtimeIdentity && (rows.length > 0 || retainLiveSnapshot) ? selection : undefined;
  // Drop stale snapshots before rendering a cleared stream or another authority scope.
  if (selection && !currentSelection) setSelection(undefined);
  const index = orderedRows.findIndex(row => row === currentSelection?.row);
  const selectedIndex = index >= 0 ? index : undefined;
  // Retain one inspected live snapshot even when the bounded buffer evicts it.
  const retainedRow = retainLiveSnapshot ? currentSelection?.row : undefined;
  const selectedRow = selectedIndex == null ? retainedRow : orderedRows[selectedIndex];
  const selectRow = useCallback(
    (index: number) => {
      const row = orderedRows[index];
      if (evidenceCurrent && row) {
        onSelectionChange?.();
        setSelection({ identity: runtimeIdentity, row, at: Date.now() });
      }
    },
    [evidenceCurrent, orderedRows, runtimeIdentity, onSelectionChange]
  );
  const closeInspector = useCallback(
    (restoreFocus = true) => {
      const trigger = hostRef.current?.querySelector<HTMLElement>(`[data-log-index="${selectedIndex ?? -1}"]`);
      setSelection(undefined);
      if (restoreFocus) queueMicrotask(() => trigger?.focus());
    },
    [selectedIndex]
  );
  return { hostRef, orderedRows, selectedIndex, selectedRow, selectedAt: selection?.at, selectRow, closeInspector };
}

export function inspectorAnalysisControls(
  props: LogInspectorAnalysisControls & { evidenceCurrent: boolean },
  close: (restoreFocus?: boolean) => void
): LogInspectorAnalysisControls {
  return {
    logAnalysisDisabledReason: props.logAnalysisDisabledReason,
    onAnalyzeLogField: props.onAnalyzeLogField
      ? (target, intent) => {
          if (!props.evidenceCurrent || !props.onAnalyzeLogField?.(target, intent)) return false;
          close(false);
          return true;
        }
      : undefined
  };
}
