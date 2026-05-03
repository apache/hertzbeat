export type TimePresetKey = '15m' | '1h' | '6h' | '24h' | '7d' | 'custom';

export interface TimeRangeValue {
  presetKey: TimePresetKey;
  label: string;
  start: number;
  end: number;
}

export interface OpsFilterState {
  environment: string[];
  team: string[];
  owner: string[];
  region: string[];
  service: string[];
  tags: string[];
  severity: string[];
  status: string[];
}

export type OpsFilterKey = keyof OpsFilterState;

export interface OpsFilterChip {
  key: OpsFilterKey;
  value: string;
  label: string;
}

export interface OpsSearchResult {
  kind: 'entity' | 'alert' | 'runbook' | 'owner' | 'tag';
  title: string;
  subtitle?: string;
  route?: string;
}

export interface DrawerPayloadSection {
  label: string;
  value: string;
}

export interface DrawerPayloadAction {
  key: string;
  label: string;
  tone?: 'primary' | 'default' | 'danger';
}

export interface DrawerPayload {
  kind: 'entity' | 'alert' | 'incident' | 'action' | 'topology' | 'explorer' | 'custom';
  title: string;
  subtitle?: string;
  status?: string;
  description?: string;
  tags?: string[];
  sections?: DrawerPayloadSection[];
  actions?: DrawerPayloadAction[];
}

export interface SelectedEntityContext {
  id: string;
  name: string;
  type: string;
}

export interface QueryContextSnapshot {
  route?: string;
  search?: string;
  params?: Record<string, string>;
}

export interface ChartDrilldownEvent {
  seriesName?: string;
  category?: string;
  timestamp?: number;
  payload?: unknown;
}
