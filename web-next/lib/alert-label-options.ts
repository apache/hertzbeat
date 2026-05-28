import type { Label, PageResult } from './types';

type ApiGetter = <T>(url: string) => Promise<T>;
type AlertLabelListReader = () => Promise<PageResult<Label>>;

export type AlertLabelOptions = {
  keys: string[];
  valuesByKey: Record<string, string[]>;
};

export const DEFAULT_ALERT_LABEL_KEYS = ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env'];

export const DEFAULT_ALERT_LABEL_OPTIONS: AlertLabelOptions = {
  keys: DEFAULT_ALERT_LABEL_KEYS,
  valuesByKey: {
    severity: ['critical', 'warning', 'info'],
    env: ['prod', 'staging', 'dev']
  }
};

function unique(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

export function buildAlertLabelOptions(labels: Label[] = []): AlertLabelOptions {
  const keys = unique([...DEFAULT_ALERT_LABEL_KEYS, ...labels.map(label => label.name)]);
  const valuesByKey = labels.reduce<Record<string, string[]>>(
    (acc, label) => {
      const key = label.name?.trim();
      const value = label.tagValue?.trim();
      if (!key || !value) return acc;
      acc[key] = unique([...(acc[key] || []), value]);
      return acc;
    },
    { ...DEFAULT_ALERT_LABEL_OPTIONS.valuesByKey }
  );

  return { keys, valuesByKey };
}

export async function loadAlertLabelOptions(apiGet: ApiGetter): Promise<AlertLabelOptions> {
  const page = await apiGet<PageResult<Label>>('/label?pageIndex=0&pageSize=9999');
  return buildAlertLabelOptions(page.content || []);
}

export async function loadAlertLabelOptionsFromFacade(readLabels: AlertLabelListReader): Promise<AlertLabelOptions> {
  const page = await readLabels();
  return buildAlertLabelOptions(page.content || []);
}
