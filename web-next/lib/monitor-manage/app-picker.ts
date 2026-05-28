type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type MonitorAppHierarchyItem = {
  category?: string | null;
  value?: string | null;
  label?: string | null;
  hide?: boolean | null;
};

export type MonitorAppPickerItem = {
  key: string;
  app: string;
  label: string;
  category: string;
  hidden: boolean;
};

export type MonitorAppPickerGroup = {
  key: string;
  label: string;
  rows: MonitorAppPickerItem[];
};

function formatMonitorCategoryLabel(category: string, t: Translator) {
  const key = `menu.monitor.${category}`;
  const translated = t(key);
  return translated && translated !== key ? translated : category.toUpperCase();
}

export function buildMonitorAppPickerGroups(items: MonitorAppHierarchyItem[], t: Translator) {
  const groups = new Map<string, MonitorAppPickerGroup>();

  for (const item of items) {
    const app = item.value?.trim();
    const category = item.category?.trim();
    if (!app || !category || category === '__system__') continue;

    if (!groups.has(category)) {
      groups.set(category, {
        key: category,
        label: formatMonitorCategoryLabel(category, t),
        rows: []
      });
    }

    groups.get(category)!.rows.push({
      key: `${category}:${app}`,
      app,
      label: item.label?.trim() || app,
      category,
      hidden: item.hide === true
    });
  }

  return Array.from(groups.values());
}

export function filterMonitorAppPickerGroups(groups: MonitorAppPickerGroup[], search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return groups;

  return groups
    .map(group => ({
      ...group,
      rows: group.rows.filter(row => row.label.toLowerCase().includes(normalizedSearch))
    }))
    .filter(group => group.rows.length > 0);
}
