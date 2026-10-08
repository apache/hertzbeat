/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Checkbox, Popover, Segmented } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { TRACE_COLUMNS, type HertzBeatTraceDisplay } from '@/platform/perses';
import { defaultTraceColumns, type TraceView } from '../model/explore-trace-view';
import { spanColumnLabel } from '../model/explore-trace-column-label';
import styles from './explore-log-columns.module.css';
export function ExploreTraceColumns({
  display,
  population = 'matched_traces',
  onChange
}: {
  display: HertzBeatTraceDisplay;
  population?: TraceView['population'] | undefined;
  onChange: (display: HertzBeatTraceDisplay) => void;
}) {
  const { t } = useTranslation();
  return (
    <Popover
      placement="bottom"
      trigger="click"
      content={<TraceColumnOptions population={population} display={display} onChange={onChange} />}
    >
      <Button>{t('explore.logColumns.title')}</Button>
    </Popover>
  );
}
function TraceColumnOptions({
  display,
  population = 'matched_traces',
  onChange
}: {
  display: HertzBeatTraceDisplay;
  population?: TraceView['population'] | undefined;
  onChange: (display: HertzBeatTraceDisplay) => void;
}) {
  const { t } = useTranslation();
  const columns = [...display.columns, ...TRACE_COLUMNS.filter(key => !display.columns.includes(key))];
  const move = (index: number, delta: number) => {
    const next = [...display.columns];
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    onChange({ ...display, columns: next });
  };
  return (
    <div className={styles.options}>
      <Segmented
        aria-label={t('explore.traceColumns.density')}
        value={display.density}
        options={(['compact', 'comfortable'] as const).map(value => ({
          value,
          label: t(`explore.traceColumns.${value}`)
        }))}
        onChange={density => onChange({ ...display, density })}
      />
      <div className={styles.list}>
        {columns.map(key => {
          const index = display.columns.indexOf(key),
            label = t(population === 'matched_spans' ? spanColumnLabel(key) : `explore.traceColumns.fields.${key}`);
          return (
            <div className={styles.row} key={key}>
              <Checkbox
                checked={index >= 0}
                disabled={key === 'traceName'}
                onChange={() =>
                  onChange({
                    ...display,
                    columns: index >= 0 ? display.columns.filter(item => item !== key) : [...display.columns, key]
                  })
                }
              >
                {label}
              </Checkbox>
              {index >= 0 && <TraceColumnMove index={index} count={display.columns.length} label={label} move={move} />}
            </div>
          );
        })}
      </div>
      <Button onClick={() => onChange({ ...display, columns: defaultTraceColumns(population) })}>
        {t('explore.logColumns.reset')}
      </Button>
    </div>
  );
}

function TraceColumnMove({
  index,
  count,
  label,
  move
}: {
  index: number;
  count: number;
  label: string;
  move: (index: number, delta: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Button
        size="small"
        disabled={index === 0}
        aria-label={t('explore.logColumns.earlier', { field: label })}
        icon={<ArrowUpOutlined />}
        onClick={() => move(index, -1)}
      />
      <Button
        size="small"
        disabled={index === count - 1}
        aria-label={t('explore.logColumns.later', { field: label })}
        icon={<ArrowDownOutlined />}
        onClick={() => move(index, 1)}
      />
    </>
  );
}
