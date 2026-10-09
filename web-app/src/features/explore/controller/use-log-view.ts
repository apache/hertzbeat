/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { useSession } from '@/core/auth/session-context';
import {
  readLogDisplayPreferences,
  writeLogDisplayPreferences,
  type ExploreLogDisplayPreferences
} from '../model/explore-log-display-preferences';
import { DEFAULT_LOG_COLUMNS, type LogColumn } from '../model/explore-log-columns';
import { encodeLogView, parseLogView, resolveLogRowHeight, type LogView } from '@/platform/perses';
import {
  logColumnDisplayPreferences,
  logViewDisplayPreferences,
  normalizeLogViewPreferenceChange,
  logViewTimeColumns
} from '../model/log-view-display-preferences';
import type { LogExploreQuery } from '../model/explore-query';
export function useLogView(
  query: LogExploreQuery,
  onChange: (encoded: string) => void,
  availableColumns: LogColumn[] = []
) {
  const { session } = useSession();
  const scope =
    session?.authenticated && session.username && session.workspaceId
      ? { workspaceId: session.workspaceId, username: session.username }
      : undefined;
  const scopeKey = scope ? JSON.stringify([scope.workspaceId, scope.username]) : undefined;
  const [storedDefaults, setStoredDefaults] = useState(() => ({
    scopeKey,
    preferences: readLogDisplayPreferences(scope)
  }));
  if (storedDefaults.scopeKey !== scopeKey) {
    setStoredDefaults({ scopeKey, preferences: readLogDisplayPreferences(scope) });
  }
  const preferencesForDefaults =
    storedDefaults.scopeKey === scopeKey ? storedDefaults.preferences : readLogDisplayPreferences(scope);
  const defaults = defaultView(preferencesForDefaults, availableColumns);
  const [rejected, setRejected] = useState(false);
  const parsed = readView(query.logView, defaults);
  const view = parsed ?? defaults;
  const preferences = logViewDisplayPreferences(view);
  const publish = (next: LogView) => {
    try {
      const encoded = encodeLogView(next);
      setRejected(false);
      onChange(encoded);
      return true;
    } catch {
      setRejected(true);
      return false;
    }
  };
  return {
    invalid: parsed === undefined,
    rejected,
    reset: () => publish(defaults),
    preferences,
    onPreferencesChange: (preferences: ExploreLogDisplayPreferences) => {
      const next = normalizeLogViewPreferenceChange(view, preferences);
      const accepted = publish(next.view);
      if (accepted) writeLogDisplayPreferences(next.preferences, scope);
    },
    logColumns: {
      columns: view.columns,
      onColumnsChange: (columns: LogColumn[]) => {
        if (!publish({ ...view, columns })) return;
        writeLogDisplayPreferences(logColumnDisplayPreferences(preferences, columns), scope);
      }
    }
  };
}
function readView(value: string | undefined, defaults: LogView) {
  if (value === undefined) return defaults;
  try {
    return parseLogView(value);
  } catch {
    return undefined;
  }
}
function defaultView(preferences: ExploreLogDisplayPreferences, availableColumns: LogColumn[]): LogView {
  const host = availableColumns.find(
    column => column.kind === 'field' && column.scope === 'resource' && column.path.join('.') === 'host.name'
  );
  const defaultColumns = host
    ? [DEFAULT_LOG_COLUMNS[0]!, host, { kind: 'service' } as const, { kind: 'message' } as const]
    : DEFAULT_LOG_COLUMNS;
  const columns = preferences.columnOrder ?? defaultColumns;
  return {
    version: 1,
    density: preferences.density,
    wrap: preferences.wrap,
    rowHeight: resolveLogRowHeight(preferences),
    contentDisplay: preferences.contentDisplay ?? 'message',
    showContent: preferences.showContent ?? true,
    standardizeHeaders: preferences.standardizeHeaders ?? true,
    showTimeline: preferences.showTimeline ?? true,
    columns: logViewTimeColumns(columns, preferences.showTime)
  };
}
