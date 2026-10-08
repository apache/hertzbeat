/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Space, Typography } from 'antd';
import isEqual from 'lodash/isEqual';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useSourceScopedValue } from '@/shared/query-context';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import { buildDashboardPanelExploreLink, resolveDashboardPanelQuery } from '../model/dashboard-panel-query';
import { DashboardPanelRuntime } from '../runtime/dashboard-panel-runtime';
import styles from './signal-dashboard.module.css';

type Props = DashboardViewProps & { panelId: string; select: (id: string) => void; selected: string | undefined };
export function SignalDashboardPanel({ state, panelId, select, selected }: Props) {
  const { t } = useTranslation();
  const panel = state.document!.spec.panels[panelId]!;
  const input = appliedPanelInput(state, panelId);
  const source = JSON.stringify([input, state.timeWindow, state.variables, state.refreshRevision]);
  const { value: cancelled, setValue: setCancelled } = useSourceScopedValue(source, false);
  const [revision, setRevision] = useState(0);
  const query = input ? resolveDashboardPanelQuery(input) : undefined;
  const link =
    query?.state === 'ready'
      ? buildDashboardPanelExploreLink(query.query, state.timeZone, state.returnPath, input?.panel.spec.plugin)
      : undefined;
  const messages = panelMessages(t, cancelled);
  const retry = () => {
    setCancelled(false);
    setRevision(value => value + 1);
  };
  return (
    <>
      <DashboardPanelHeader
        panel={panel}
        panelId={panelId}
        editing={!!state.editor}
        selected={selected}
        select={select}
        link={link}
      />
      {panel.spec.plugin.kind === 'TracingGanttChart' && (
        <Typography.Text type="secondary">{t('signalDashboard.addFixedTrace')}</Typography.Text>
      )}
      {input ? (
        <DashboardPanelRuntime
          key={state.runtimeIdentity}
          {...input}
          panelId={panelId}
          timeZone={state.timeZone}
          refreshRevision={state.refreshRevision + revision}
          enabled={state.validView && !cancelled}
          messages={messages}
          actions={{ retry, cancel: () => setCancelled(true), cancelled }}
          className={styles.runtime}
        />
      ) : (
        <Typography.Paragraph role="status">{messages.inactive}</Typography.Paragraph>
      )}
    </>
  );
}

function appliedPanelInput(state: DashboardViewProps['state'], panelId: string) {
  const panel = state.document!.spec.panels[panelId]!;
  const candidate = state.preview?.spec.panels[panelId];
  const applied =
    candidate &&
    isEqual(candidate.spec.queries, panel.spec.queries) &&
    isEqual(candidate.spec.plugin, panel.spec.plugin) &&
    isEqual(state.preview?.spec.variables, state.document!.spec.variables)
      ? candidate
      : undefined;

  if (!applied || !state.timeWindow) return undefined;
  return {
    panel: applied,
    variables: state.preview!.spec.variables,
    variableValues: state.variables,
    timeWindow: state.timeWindow
  };
}
function panelMessages(t: TFunction, cancelled: boolean) {
  return {
    loading: t('signalDashboard.loadingPanel'),
    empty: t('signalDashboard.emptyPanel'),
    truncated: t('signalDashboard.truncated'),
    truncationUnknown: t('signalDashboard.unknownCoverage'),
    bounded: (rowLimit: number | null) => t('signalDashboard.bounded', { limit: rowLimit ?? t('common.unknown') }),
    runtimeError: t('signalDashboard.runtimeError'),
    inactive: t(cancelled ? 'signalDashboard.cancelled' : 'signalDashboard.applyFirst'),
    failures: {
      'perses.query.invalid': t('signalDashboard.queryFailures.invalid'),
      'perses.query.permission': t('signalDashboard.queryFailures.permission'),
      'perses.query.overloaded': t('signalDashboard.queryFailures.overloaded'),
      'perses.query.unavailable': t('signalDashboard.queryFailures.unavailable'),
      'perses.query.contract': t('signalDashboard.queryFailures.contract')
    }
  };
}

function DashboardPanelHeader({
  panel,
  panelId,
  editing,
  selected,
  select,
  link
}: {
  panel: NonNullable<DashboardViewProps['state']['document']>['spec']['panels'][string];
  panelId: string;
  editing: boolean;
  selected: string | undefined;
  select: (id: string) => void;
  link: ReturnType<typeof buildDashboardPanelExploreLink> | undefined;
}) {
  const { t } = useTranslation();
  return (
    <header className={styles.panelHeader} data-dashboard-drag-handle>
      {editing ? (
        <button
          className={styles.selectPanel}
          type="button"
          aria-pressed={selected === panelId}
          onClick={() => select(panelId)}
        >
          {panel.spec.display.name}
        </button>
      ) : (
        <h3>{panel.spec.display.name}</h3>
      )}
      <Space size="small" wrap>
        {link?.state === 'ready' && <Link to={link.path}>{t('signalDashboard.openExplore')}</Link>}
      </Space>
    </header>
  );
}
