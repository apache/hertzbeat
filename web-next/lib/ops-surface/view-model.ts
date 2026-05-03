type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function buildOpsFacts(title: string, focus: string, tags: string[], t: Translator) {
  return [
    { label: t('common.workspace'), value: title.toLowerCase() },
    { label: t('common.focus'), value: focus },
    { label: t('common.mode'), value: t('ops.surface.mode.entry') },
    { label: t('common.signals'), value: String(tags.length) }
  ];
}

export function buildOpsStatusRows(t: Translator) {
  return [
    { title: t('ops.surface.shared-shell.title'), copy: t('ops.surface.shared-shell.copy') },
    { title: t('ops.surface.focused-scope.title'), copy: t('ops.surface.focused-scope.copy') }
  ];
}
