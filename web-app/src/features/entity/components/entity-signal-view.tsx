/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';

import {
  HertzBeatLogsTableResult,
  HertzBeatTraceTableResult,
  HertzBeatTracingGanttChartResult,
  type HertzBeatPersesPrimitiveMessages,
  type HertzBeatTraceGanttQueryOutcome,
  type HertzBeatTraceTableQueryOutcome
} from '@/platform/perses';

import type { EntityExploreSignal } from '../model/entity-operational-navigation';
import type { EntitySignalViewState } from '../model/entity-signal-view-model';
import { EntitySignalBoundMonitorState } from './entity-signal-bound-monitor-state';
import { EvidenceRail, SignalAvailability } from './entity-signal-evidence';
import { EntitySignalMetricsSection } from './entity-signal-metrics-section';
import { EntitySignalSection } from './entity-signal-section';
import styles from './entity-signal-view.module.css';

type ReadyState = Extract<EntitySignalViewState, { kind: 'ready' }>;

export function EntitySignalView({
  state,
  openSignal,
  openTopology
}: {
  state: EntitySignalViewState;
  openSignal: (signal: EntityExploreSignal) => void;
  openTopology: () => void;
}) {
  const { t } = useTranslation();
  if (state.kind === 'invalid_window') {
    return <div className={styles.compactState}>{t('entity.signals.invalidWindow')}</div>;
  }
  const messages = primitiveMessages(t);
  return (
    <section className={styles.workspace} aria-label={t('entity.signals.title')}>
      <SignalAvailability state={state} />
      <div className={styles.investigationGrid}>
        <div className={styles.signalStack}>
          <EntitySignalMetricsSection state={state} messages={messages} open={() => openSignal('metrics')} />
          <LogsSection state={state} messages={messages} open={() => openSignal('logs')} />
          <TracesSection state={state} messages={messages} open={() => openSignal('traces')} />
          <ContextSections state={state} openTopology={openTopology} />
        </div>
        <EvidenceRail state={state} />
      </div>
    </section>
  );
}

type SectionProps = { state: ReadyState; messages: HertzBeatPersesPrimitiveMessages; open: () => void };

function LogsSection({ state, messages, open }: SectionProps) {
  const { t } = useTranslation();
  if (state.logs?.state !== 'ready') return null;
  return (
    <EntitySignalSection title={t('entity.signals.sections.logs')} action={open}>
      <HertzBeatLogsTableResult
        title={t('entity.signals.sections.logs')}
        ariaLabel={t('entity.signals.aria.logs')}
        messages={messages}
        query={state.plan.logsQuery}
        outcome={state.logs}
      />
    </EntitySignalSection>
  );
}

function TracesSection({ state, messages, open }: SectionProps) {
  const { t } = useTranslation();
  if (state.traces?.state !== 'ready') return null;
  const query = state.plan.tracesQuery;
  return (
    <EntitySignalSection title={t('entity.signals.sections.traces')} action={open}>
      {query.queryKind === 'gantt' ? (
        <HertzBeatTracingGanttChartResult
          title={t('entity.signals.traceDetail')}
          ariaLabel={t('entity.signals.aria.traceDetail')}
          messages={messages}
          query={query}
          outcome={state.traces as Extract<HertzBeatTraceGanttQueryOutcome, { state: 'ready' }>}
        />
      ) : (
        <HertzBeatTraceTableResult
          title={t('entity.signals.sections.traces')}
          ariaLabel={t('entity.signals.aria.traces')}
          messages={messages}
          query={query}
          outcome={state.traces as Extract<HertzBeatTraceTableQueryOutcome, { state: 'ready' }>}
        />
      )}
    </EntitySignalSection>
  );
}

function ContextSections({ state, openTopology }: { state: ReadyState; openTopology: () => void }) {
  const { t } = useTranslation();
  return (
    <div className={styles.contextGrid}>
      {state.capabilities.topology === 'available' && state.topology.total != null ? (
        <EntitySignalSection title={t('entity.signals.sections.topology')} action={openTopology} compact>
          <NameList names={state.topology.names} total={state.topology.total} />
        </EntitySignalSection>
      ) : null}
      <EntitySignalSection title={t('entity.signals.boundMonitors')} compact>
        <EntitySignalBoundMonitorState state={state.boundMonitors} />
      </EntitySignalSection>
    </div>
  );
}

function NameList({ names, total }: { names: string[]; total: number }) {
  const { t } = useTranslation();
  return (
    <div className={styles.nameList}>
      <strong>{t('entity.signals.items', { count: total })}</strong>
      {names.map(name => (
        <span key={name}>{name}</span>
      ))}
    </div>
  );
}

function primitiveMessages(t: ReturnType<typeof useTranslation>['t']): HertzBeatPersesPrimitiveMessages {
  return {
    loading: t('entity.signals.query.loading'),
    empty: t('entity.signals.query.empty'),
    truncated: t('entity.signals.query.truncated'),
    truncationUnknown: t('entity.signals.query.truncationUnknown'),
    runtimeError: t('entity.signals.query.runtimeError'),
    failures: {
      'perses.query.invalid': t('entity.signals.query.invalid'),
      'perses.query.permission': t('entity.signals.query.permission'),
      'perses.query.overloaded': t('entity.signals.query.overloaded'),
      'perses.query.unavailable': t('entity.signals.query.unavailable'),
      'perses.query.contract': t('entity.signals.query.contract')
    }
  };
}
