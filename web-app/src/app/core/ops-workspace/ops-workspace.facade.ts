import { Injectable, computed, signal } from '@angular/core';

import {
  DrawerPayload,
  OpsFilterChip,
  OpsFilterKey,
  OpsFilterState,
  QueryContextSnapshot,
  SelectedEntityContext,
  TimePresetKey,
  TimeRangeValue
} from './ops-workspace.types';

const PRESET_LABELS: Record<Exclude<TimePresetKey, 'custom'>, string> = {
  '15m': 'Last 15m',
  '1h': 'Last 1h',
  '6h': 'Last 6h',
  '24h': 'Last 24h',
  '7d': 'Last 7d'
};

const FILTER_LABELS: Record<OpsFilterKey, string> = {
  environment: 'Env',
  team: 'Team',
  owner: 'Owner',
  region: 'Region',
  service: 'Service',
  tags: 'Tag',
  severity: 'Severity',
  status: 'Status'
};

function createEmptyFilters(): OpsFilterState {
  return {
    environment: [],
    team: [],
    owner: [],
    region: [],
    service: [],
    tags: [],
    severity: [],
    status: []
  };
}

function createPresetRange(presetKey: Exclude<TimePresetKey, 'custom'>): TimeRangeValue {
  const end = Date.now();
  const start = end - getPresetDurationMs(presetKey);
  return {
    presetKey,
    label: PRESET_LABELS[presetKey],
    start,
    end
  };
}

function getPresetDurationMs(presetKey: Exclude<TimePresetKey, 'custom'>): number {
  switch (presetKey) {
    case '15m':
      return 15 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '6h':
      return 6 * 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
  }
}

@Injectable({
  providedIn: 'root'
})
export class OpsWorkspaceFacade {
  private readonly timeRangeState = signal<TimeRangeValue>(createPresetRange('1h'));
  private readonly autoRefreshState = signal(false);
  private readonly filtersState = signal<OpsFilterState>(createEmptyFilters());
  private readonly selectedEntityState = signal<SelectedEntityContext | null>(null);
  private readonly drawerState = signal<DrawerPayload | null>(null);
  private readonly queryContextState = signal<QueryContextSnapshot>({});

  readonly timeRange = this.timeRangeState.asReadonly();
  readonly autoRefresh = this.autoRefreshState.asReadonly();
  readonly filters = this.filtersState.asReadonly();
  readonly selectedEntity = this.selectedEntityState.asReadonly();
  readonly drawer = this.drawerState.asReadonly();
  readonly queryContext = this.queryContextState.asReadonly();
  readonly filterChips = computed<OpsFilterChip[]>(() => {
    const filters = this.filtersState();
    return (Object.keys(filters) as OpsFilterKey[]).flatMap(key =>
      filters[key].map(value => ({
        key,
        value,
        label: FILTER_LABELS[key]
      }))
    );
  });

  setTimePreset(presetKey: Exclude<TimePresetKey, 'custom'>): void {
    this.timeRangeState.set(createPresetRange(presetKey));
  }

  setCustomTimeRange(start: number, end: number, label = 'Custom Range'): void {
    this.timeRangeState.set({
      presetKey: 'custom',
      label,
      start,
      end
    });
  }

  setAutoRefresh(enabled: boolean): void {
    this.autoRefreshState.set(enabled);
  }

  patchFilters(partial: Partial<OpsFilterState>): void {
    this.filtersState.update(filters => {
      const nextState = { ...filters };
      for (const [key, values] of Object.entries(partial) as Array<[OpsFilterKey, string[] | undefined]>) {
        if (!values) {
          continue;
        }
        nextState[key] = Array.from(new Set(values.filter(Boolean)));
      }
      return nextState;
    });
  }

  appendFilter(key: OpsFilterKey, value: string): void {
    if (!value.trim()) {
      return;
    }
    this.filtersState.update(filters => ({
      ...filters,
      [key]: Array.from(new Set([...filters[key], value.trim()]))
    }));
  }

  removeFilter(key: OpsFilterKey, value: string): void {
    this.filtersState.update(filters => ({
      ...filters,
      [key]: filters[key].filter(item => item !== value)
    }));
  }

  clearFilters(): void {
    this.filtersState.set(createEmptyFilters());
  }

  setSelectedEntity(entity: SelectedEntityContext | null): void {
    this.selectedEntityState.set(entity);
  }

  openDrawer(payload: DrawerPayload): void {
    this.drawerState.set(payload);
  }

  closeDrawer(): void {
    this.drawerState.set(null);
  }

  setQueryContext(partial: Partial<QueryContextSnapshot>): void {
    this.queryContextState.update(current => ({
      ...current,
      ...partial,
      params: partial.params ? { ...partial.params } : current.params
    }));
  }

  clearQueryContext(): void {
    this.queryContextState.set({});
  }
}
