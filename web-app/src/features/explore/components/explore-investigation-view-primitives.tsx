/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import type { InvestigationTimeWindow } from '@/shared/query-context';

import type { InvestigationBlock, InvestigationEvidenceState } from '../model/explore-investigation-contract';
import styles from './explore-investigation-view.module.css';

export type AvailabilityItem = {
  key: string;
  label: string;
  state: InvestigationEvidenceState;
};

export function InvestigationContextBand({
  window,
  onBack,
  onRefresh
}: {
  window: InvestigationTimeWindow;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const { t } = useInvestigationTranslation();
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: window.timeZone
  });
  return (
    <header className={styles.contextBand} data-investigation-context>
      <div>
        <strong>{t('exploreInvestigation.title')}</strong>
        <span>{t('exploreInvestigation.exactWindow')}</span>
        <time>{`${formatter.format(window.from)} – ${formatter.format(window.to)}`}</time>
      </div>
      <div className={styles.contextActions}>
        <Button onClick={onBack}>{t('exploreInvestigation.actions.backToResults')}</Button>
        <Button onClick={onRefresh}>{t('common.refresh')}</Button>
      </div>
    </header>
  );
}

export function InvestigationAvailability({
  items,
  ariaLabel,
  stateLabels
}: {
  items: AvailabilityItem[];
  ariaLabel?: string | undefined;
  stateLabels?: Partial<Record<InvestigationEvidenceState, string>> | undefined;
}) {
  const { t } = useInvestigationTranslation();
  return (
    <section
      className={styles.availability}
      data-investigation-availability
      aria-label={ariaLabel ?? t('exploreInvestigation.availability')}
    >
      <div className={styles.capabilityGrid} data-count={items.length}>
        {items.map(item => (
          <div className={styles.capability} key={item.key}>
            <strong>{item.label}</strong>
            <Tag className={styles.stateTag ?? ''} color={stateTone(item.state)}>
              {stateLabels?.[item.state] ??
                t(`exploreInvestigation.states.${item.state === 'ready' ? 'available' : item.state}`)}
            </Tag>
          </div>
        ))}
      </div>
    </section>
  );
}

export function InvestigationSection({
  title,
  action,
  actionLabel,
  evidenceCurrent,
  children
}: {
  title: string;
  action?: (() => void) | undefined;
  actionLabel?: string | undefined;
  evidenceCurrent: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.signalSection} data-investigation-section aria-label={title}>
      <header className={styles.sectionHeader}>
        <h2>{title}</h2>
        {action && actionLabel ? (
          <Button disabled={!evidenceCurrent} onClick={action}>
            {actionLabel}
          </Button>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function InvestigationBlockState({
  state,
  noTraceContext,
  reason,
  message
}: {
  state: 'empty' | 'unavailable';
  reason?: InvestigationBlock['reason'] | undefined;
  noTraceContext?: boolean;
  message?: string | undefined;
}) {
  const { t } = useInvestigationTranslation();
  return (
    <div className={styles.compactState} data-state={state}>
      {message ??
        t(
          noTraceContext
            ? 'exploreInvestigation.states.noTraceContext'
            : reason && reason !== 'observed'
              ? `exploreInvestigation.reasons.${reason}`
              : `exploreInvestigation.states.${state}`
        )}
    </div>
  );
}

function stateTone(state: AvailabilityItem['state']) {
  if (state === 'ready') return 'green';
  if (state === 'unavailable') return 'gold';
  return 'default';
}

function useInvestigationTranslation() {
  // Kept local so the presentation primitives stay independent of controller ownership.
  return useTranslation();
}
