type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function buildOpsFacts(title: string, focus: string, tags: string[], t: Translator) {
  return [
    { label: t('common.workspace'), value: title.toLowerCase() },
    { label: t('ops.surface.fact.focus-label'), value: focus },
    { label: t('ops.surface.fact.mode-label'), value: t('ops.surface.fact.mode-entry') },
    { label: t('ops.surface.fact.signals-label'), value: String(tags.length) }
  ];
}

export function buildOpsStatusRows(t: Translator) {
  return [
    { title: t('ops.surface.shared-shell.title'), copy: t('ops.surface.shared-shell.copy') },
    { title: t('ops.surface.focused-scope.title'), copy: t('ops.surface.focused-scope.copy') }
  ];
}
