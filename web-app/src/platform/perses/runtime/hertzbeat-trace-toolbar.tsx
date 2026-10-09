/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Checkbox, Select } from 'antd';
import { useTranslation } from 'react-i18next';
export type TraceDisplayOptions = {
  errorsOnly: boolean;
  focusedSpanId?: string;
  collapsed: boolean;
  collapseRevision: number;
  color: 'auto' | 'status';
  list: boolean;
};
export function HertzBeatTraceToolbar({
  view,
  onChange,
  selectedSpanId
}: {
  view: TraceDisplayOptions;
  onChange: (view: TraceDisplayOptions) => void;
  selectedSpanId: string | undefined;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Checkbox checked={view.errorsOnly} onChange={event => onChange({ ...view, errorsOnly: event.target.checked })}>
        {t('explore.traceTools.errors')}
      </Checkbox>
      <Button
        type="text"
        onClick={() => onChange({ ...view, collapsed: !view.collapsed, collapseRevision: view.collapseRevision + 1 })}
      >
        {t(view.collapsed ? 'explore.traceTools.expand' : 'explore.traceTools.collapse')}
      </Button>
      <Button
        type="text"
        disabled={!selectedSpanId}
        onClick={() => onChange({ ...view, focusedSpanId: selectedSpanId! })}
      >
        {t('explore.traceTools.focus')}
      </Button>
      <Button
        type="text"
        disabled={!view.focusedSpanId}
        onClick={() => {
          const next = { ...view };
          delete next.focusedSpanId;
          onChange(next);
        }}
      >
        {t('explore.traceTools.reset')}
      </Button>
      <Select
        aria-label={t('explore.traceTools.color')}
        value={view.color}
        onChange={color => onChange({ ...view, color })}
        options={(['auto', 'status'] as const).map(value => ({ value, label: t(`explore.traceTools.${value}`) }))}
      />
      <Button type="text" aria-pressed={view.list} onClick={() => onChange({ ...view, list: !view.list })}>
        {t(view.list ? 'explore.traceTools.waterfall' : 'explore.traceTools.list')}
      </Button>
    </>
  );
}
