/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Input, Popover } from 'antd';
import { TagsOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { MetricQueryRow } from '@/platform/perses';
import styles from './explore-metric-plan-editor.module.css';

export function MetricRowFilter({
  row,
  update,
  activeRef,
  discoveryControls
}: {
  row: MetricQueryRow;
  update: (patch: Partial<MetricQueryRow>) => void;
  activeRef: string;
  discoveryControls?: ReactNode;
}) {
  const { t } = useTranslation();
  const { trigger, content, open, setOpen, close } = useMetricFilterPopup(activeRef, row.refId);
  return (
    <div className={styles.from}>
      <MetricFilterInput row={row} update={update} />
      <Popover
        fresh
        trigger="click"
        placement="bottomLeft"
        open={open}
        onOpenChange={setOpen}
        content={
          <div
            className={styles.labelPopover}
            ref={content}
            onKeyDown={event => {
              if (event.key === 'Escape' && !event.defaultPrevented) {
                event.stopPropagation();
                close();
              }
            }}
          >
            {discoveryControls}
          </div>
        }
      >
        <Button
          ref={trigger}
          type="text"
          icon={<TagsOutlined />}
          aria-label={t('explore.metricComposition.discoverFor', { ref: row.refId })}
          aria-expanded={open}
          title={t('explore.metricComposition.discoverFor', { ref: row.refId })}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        />
      </Popover>
    </div>
  );
}

function MetricFilterInput({ row, update }: { row: MetricQueryRow; update: (patch: Partial<MetricQueryRow>) => void }) {
  const { t } = useTranslation();
  return (
    <>
      <span>{t('explore.metricComposition.fromLabel')}</span>
      <Input
        aria-label={`${row.refId} ${t('exploreMetric.filter')}`}
        value={row.metricFilter ?? ''}
        placeholder={t('explore.metricComposition.filterPlaceholder')}
        onChange={event => update({ metricFilter: event.target.value })}
      />
    </>
  );
}

function useMetricFilterPopup(activeRef: string, rowRef: string) {
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState({ owner: activeRef, open: false });
  if (popup.owner !== activeRef) setPopup({ owner: activeRef, open: false });
  const open = popup.open && popup.owner === activeRef && activeRef === rowRef;
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      content.current?.querySelector<HTMLInputElement>('input:not([disabled])')?.focus()
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);
  return {
    trigger,
    content,
    open,
    setOpen: (next: boolean) => setPopup({ owner: activeRef, open: next }),
    close: () => {
      setPopup({ owner: activeRef, open: false });
      trigger.current?.focus();
    }
  };
}
