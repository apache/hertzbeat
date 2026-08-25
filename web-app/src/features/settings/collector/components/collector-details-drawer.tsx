/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { CloseOutlined, DownOutlined, LeftOutlined, RightOutlined, UpOutlined } from '@ant-design/icons';
import { Badge, Button, Drawer, Space, Typography } from 'antd';
import type { TFunction } from 'i18next';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { classifyCollectorKind } from '../model/collector-kind-model';
import type { CollectorMutationAction, CollectorRecord } from '../model/collector-model';
import styles from './collector-details-drawer.module.css';
import { CollectorIntakeStateTag } from './collector-intake-state-tag';
import { CollectorKindTag } from './collector-kind-tag';
import { CollectorRowActions } from './collector-row-actions';
import { CollectorRuntimeReportFacts } from './collector-runtime-report-facts';

const defaultWidth = 520;
const minWidth = 440;
const maxWidth = 760;

type Props = {
  canWrite: boolean;
  canDelete: boolean;
  busy: boolean;
  record: CollectorRecord | null;
  position: number;
  total: number;
  onAction: (action: CollectorMutationAction, collectors: string[]) => void;
  onIntake: (name: string) => void;
  onRuntime: (name: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
};

export function CollectorDetailsDrawer({ record, position, total, onPrevious, onNext, onClose, ...actions }: Props) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(defaultWidth);

  function onInspectorKeyDown(event: KeyboardEvent) {
    if (isTypingTarget(event.target)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowUp' && position > 1) {
      event.preventDefault();
      onPrevious();
    } else if (event.key === 'ArrowDown' && position < total) {
      event.preventDefault();
      onNext();
    }
  }

  return (
    <Drawer
      title={record ? t('collectors.details.title', { name: record.name }) : undefined}
      open={Boolean(record)}
      width={width}
      mask={false}
      closable={false}
      keyboard={false}
      rootClassName={styles.drawer!}
      destroyOnHidden
      footer={
        record ? (
          <CollectorRowActions
            record={record}
            t={t}
            collapseDanger
            canWrite={actions.canWrite}
            canDelete={actions.canDelete}
            busy={actions.busy}
            onAction={actions.onAction}
            onIntake={actions.onIntake}
            onRuntime={actions.onRuntime}
          />
        ) : null
      }
      onKeyDown={onInspectorKeyDown}
      onClose={onClose}
    >
      {record && (
        <div className={styles.inspector}>
          <ResizeHandle width={width} setWidth={setWidth} label={t('collectors.details.resize')} />
          <InspectorHeader
            record={record}
            position={position}
            total={total}
            t={t}
            onPrevious={onPrevious}
            onNext={onNext}
            onClose={onClose}
          />
          <div className={styles.content}>
            <InspectorSection title={t('collectors.details.properties')}>
              <dl className={styles.propertyList}>
                <Fact label={t('collectors.kind.column')} value={<CollectorKindTag record={record} />} />
                <Fact label={t('collectors.mode')} value={record.mode || '—'} />
                <Fact label={t('collectors.address')} value={record.address || '—'} />
                <Fact label={t('collectors.version')} value={record.version || '—'} />
                <Fact label={t('collectors.details.updatedAt')} value={collectorUpdatedAt(record.updatedAt)} />
              </dl>
            </InspectorSection>
            <InspectorSection title={t('collectors.details.assignments')}>
              <dl className={styles.propertyList}>
                <Fact label={t('collectors.tasks')} value={record.pinMonitorNum + record.dispatchMonitorNum} />
                <Fact label={t('collectors.pinned')} value={record.pinMonitorNum} />
                <Fact label={t('collectors.dispatched')} value={record.dispatchMonitorNum} />
              </dl>
            </InspectorSection>
            <InspectorSection title={t('collectors.details.operations')}>
              <dl className={styles.propertyList}>
                <Fact label={t('collectors.intake.column')} value={collectorIntake(record, t)} alignStart />
                <Fact label={t('collectors.runtime.report.column')} value={collectorRuntime(record, t)} alignStart />
              </dl>
            </InspectorSection>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function InspectorHeader({
  record,
  position,
  total,
  t,
  onPrevious,
  onNext,
  onClose
}: {
  record: CollectorRecord;
  position: number;
  total: number;
  t: TFunction;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTopline}>
        <span className={styles.position}>{t('collectors.details.position', { current: position, total })}</span>
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<UpOutlined />}
            aria-label={t('collectors.details.previous')}
            disabled={position <= 1}
            onClick={onPrevious}
          />
          <Button
            type="text"
            size="small"
            icon={<DownOutlined />}
            aria-label={t('collectors.details.next')}
            disabled={position >= total}
            onClick={onNext}
          />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            aria-label={t('collectors.details.close')}
            onClick={onClose}
          />
        </Space>
      </div>
      <div className={styles.identity}>
        <div className={styles.identityCopy}>
          <Typography.Title level={3} className={styles.name!}>
            {record.name}
          </Typography.Title>
          <div className={styles.identityMeta}>
            <CollectorKindTag record={record} />
            <Typography.Text type="secondary">{record.mode || '—'}</Typography.Text>
          </div>
        </div>
        <span className={record.online ? styles.statusOnline : styles.statusOffline}>
          <Badge
            status={record.online ? 'success' : 'error'}
            text={t(record.online ? 'collectors.online' : 'collectors.offline')}
          />
        </span>
      </div>
    </header>
  );
}

function InspectorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <Typography.Title level={5} className={styles.sectionTitle!}>
        {title}
      </Typography.Title>
      {children}
    </section>
  );
}

function Fact({ label, value, alignStart = false }: { label: string; value: ReactNode; alignStart?: boolean }) {
  return (
    <div className={alignStart ? styles.factAlignStart : styles.fact}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue}>{value}</dd>
    </div>
  );
}

function ResizeHandle({ width, setWidth, label }: { width: number; setWidth: (width: number) => void; label: string }) {
  const origin = useRef<{ x: number; width: number } | null>(null);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    origin.current = { x: event.clientX, width };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!origin.current) return;
    setWidth(clampWidth(origin.current.width + origin.current.x - event.clientX));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    origin.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setWidth(clampWidth(width + (event.key === 'ArrowLeft' ? 24 : -24)));
  }

  return (
    <div
      className={styles.resizeHandle}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <span aria-hidden="true">
        <LeftOutlined />
        <RightOutlined />
      </span>
    </div>
  );
}

function collectorIntake(record: CollectorRecord, t: TFunction) {
  return classifyCollectorKind(record) === 'embedded_java' ? (
    <Typography.Text type="secondary">{t('collectors.kind.notApplicable')}</Typography.Text>
  ) : (
    <CollectorIntakeStateTag intake={record.instrumentationIntake} />
  );
}

function collectorRuntime(record: CollectorRecord, t: TFunction) {
  return classifyCollectorKind(record) === 'embedded_java' ? (
    <Typography.Text type="secondary">{t('collectors.kind.notApplicable')}</Typography.Text>
  ) : (
    <CollectorRuntimeReportFacts report={record.runtimeReport} />
  );
}

function collectorUpdatedAt(value: string | null) {
  if (!value) return '—';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

function clampWidth(width: number) {
  return Math.min(maxWidth, Math.max(minWidth, width));
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
  );
}
