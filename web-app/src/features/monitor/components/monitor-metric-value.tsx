/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { CopyOutlined } from '@ant-design/icons';
import { Button, Popover, Tooltip } from 'antd';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './monitor-realtime-table.module.css';

export function MonitorMetricValue({ field, value }: { field: string; value: string }) {
  const { t } = useTranslation();
  const label = t('monitorMetrics.value.open', { field });
  const [stored, setStored] = useState<ValueInteraction>(() => initialInteraction(value));
  const interaction = activeInteraction(stored, value);
  const update = (change: Partial<ValueInteraction>) =>
    setStored(current => ({ ...activeInteraction(current, value), ...change, value }));
  return (
    <MetricValueTrigger
      label={label}
      value={value}
      popoverOpen={interaction.popoverOpen}
      onPopoverOpen={popoverOpen => update({ popoverOpen })}
      popoverTitle={t('monitorMetrics.value.title', { field })}
      popoverContent={
        <MetricValuePopoverContent
          field={field}
          value={value}
          copyState={interaction.copyState}
          onCopyState={copyState => update({ copyState })}
        />
      }
    />
  );
}

type MetricValueTriggerProps = {
  label: string;
  value: string;
  popoverOpen: boolean;
  popoverTitle: string;
  popoverContent: ReactNode;
  onPopoverOpen: (open: boolean) => void;
};

function MetricValueTrigger(props: MetricValueTriggerProps) {
  const { label, value, popoverOpen, popoverTitle, popoverContent, onPopoverOpen } = props;
  const valueRef = useRef<HTMLSpanElement>(null);
  const [measurement, setMeasurement] = useState({ value, overflowed: false });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const overflowed = measurement.value === value && measurement.overflowed;
  const measure = useCallback(() => {
    const node = valueRef.current;
    if (node) setMeasurement({ value, overflowed: node.scrollWidth > node.clientWidth });
  }, [value]);
  useLayoutEffect(() => observeOverflow(valueRef, measure), [measure, value]);
  const open = overflowed && popoverOpen;
  return (
    <Tooltip
      title={value}
      open={overflowed && !open && (hovered || focused)}
      placement="top"
      mouseEnterDelay={0.25}
      destroyOnHidden
    >
      <Popover
        trigger="click"
        placement="topRight"
        destroyOnHidden
        open={open}
        onOpenChange={next => overflowed && onPopoverOpen(next)}
        title={popoverTitle}
        content={popoverContent}
      >
        <span
          ref={valueRef}
          className={styles.metricValueText}
          {...(overflowed
            ? {
                'aria-expanded': open,
                'aria-haspopup': 'dialog' as const,
                'aria-label': label,
                role: 'button',
                tabIndex: 0
              }
            : {})}
          onMouseEnter={() => {
            measure();
            setHovered(true);
          }}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => {
            measure();
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={event => handleTriggerKey(event, overflowed, open, onPopoverOpen, setFocused)}
        >
          {value}
        </span>
      </Popover>
    </Tooltip>
  );
}

function observeOverflow(ref: RefObject<HTMLSpanElement | null>, measure: () => void) {
  measure();
  if (typeof ResizeObserver === 'undefined' || !ref.current) return;
  const observer = new ResizeObserver(measure);
  observer.observe(ref.current);
  return () => observer.disconnect();
}

function handleTriggerKey(
  event: KeyboardEvent<HTMLSpanElement>,
  overflowed: boolean,
  open: boolean,
  setOpen: (open: boolean) => void,
  setFocused: (focused: boolean) => void
) {
  if (!overflowed) return;
  if (event.key === 'Escape' && open) {
    event.preventDefault();
    setOpen(false);
    setFocused(false);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    setOpen(!open);
  }
}

function MetricValuePopoverContent({
  field,
  value,
  copyState,
  onCopyState
}: {
  field: string;
  value: string;
  copyState: ValueInteraction['copyState'];
  onCopyState: (copyState: 'copied' | 'error') => void;
}) {
  const { t } = useTranslation();
  const copyKey = copyState === 'idle' ? 'copy' : copyState;
  return (
    <div className={styles.metricValuePopover} role="dialog" aria-label={t('monitorMetrics.value.title', { field })}>
      <div className={styles.metricValuePopoverText}>{value}</div>
      <Button
        size="small"
        type="text"
        icon={<CopyOutlined />}
        aria-label={t(`monitorMetrics.value.${copyKey}`)}
        onClick={() => void copyValue(value, onCopyState)}
      >
        {t(`monitorMetrics.value.${copyKey}`)}
      </Button>
    </div>
  );
}

async function copyValue(value: string, setCopyState: (state: 'copied' | 'error') => void) {
  try {
    await navigator.clipboard.writeText(value);
    setCopyState('copied');
  } catch {
    setCopyState('error');
  }
}

type ValueInteraction = { value: string; popoverOpen: boolean; copyState: 'idle' | 'copied' | 'error' };

function initialInteraction(value: string): ValueInteraction {
  return { value, popoverOpen: false, copyState: 'idle' };
}

function activeInteraction(interaction: ValueInteraction, value: string) {
  return interaction.value === value ? interaction : initialInteraction(value);
}
