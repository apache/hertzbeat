/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { TFunction } from 'i18next';

export function monitorEditorFieldLabels(t: TFunction) {
  const map = {
    add: t('monitor.editor.map.add'),
    remove: t('monitor.editor.map.remove'),
    key: t('monitor.editor.map.key'),
    value: t('monitor.editor.map.value'),
    emptyError: t('monitor.editor.map.empty'),
    duplicateError: t('monitor.editor.map.duplicate')
  };
  return {
    map,
    metrics: {
      ...map,
      unit: t('monitor.editor.metrics.unit'),
      type: t('monitor.editor.metrics.type'),
      numberType: t('monitor.editor.metrics.number'),
      stringType: t('monitor.editor.metrics.string')
    }
  };
}

export type MonitorEditorFieldLabels = ReturnType<typeof monitorEditorFieldLabels>;
