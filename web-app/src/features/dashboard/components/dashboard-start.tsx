/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiOutlined, ArrowRightOutlined, GlobalOutlined, LinkOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import dotnetIcon from 'devicon/icons/dotnetcore/dotnetcore-original.svg';
import javaIcon from 'devicon/icons/java/java-original.svg';
import linuxIcon from 'devicon/icons/linux/linux-original.svg';
import mysqlIcon from 'devicon/icons/mysql/mysql-original.svg';
import nodeIcon from 'devicon/icons/nodejs/nodejs-original.svg';
import otelIcon from 'devicon/icons/opentelemetry/opentelemetry-original.svg';
import redisIcon from 'devicon/icons/redis/redis-original.svg';
import { useTranslation } from 'react-i18next';

import styles from './dashboard-start.module.css';
import { DashboardStartLink } from './dashboard-start-link';

type DashboardStartProps = {
  canCreateMonitor: boolean;
  createMonitorTarget: string;
  monitorListTarget: string;
  telemetryTarget: string;
  openCreateMonitor: () => void;
  openMonitors: () => void;
  openTelemetry: () => void;
};

const activeTargets = [
  ['mysql', mysqlIcon],
  ['linux', linuxIcon],
  ['redis', redisIcon]
] as const;
const telemetrySources = [
  ['java', javaIcon],
  ['dotnet', dotnetIcon],
  ['node', nodeIcon],
  ['collector', otelIcon]
] as const;

export function DashboardStart(props: DashboardStartProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.startSurface}>
      <DashboardEntry
        kind="active-monitoring"
        title={t('dashboard.start.active.title')}
        summary={t('dashboard.start.active.summary')}
        flow={<ActiveMonitoringFlow />}
        outcomeTitle={t('dashboard.start.active.outcomeTitle')}
        outcomes={[t('dashboard.start.active.outcomeAvailability'), t('dashboard.start.active.outcomeMetrics')]}
        suitability={t('dashboard.start.active.suitability')}
        action={
          props.canCreateMonitor ? (
            <DashboardStartLink
              label={t('dashboard.start.active.action')}
              target={props.createMonitorTarget}
              onNavigate={props.openCreateMonitor}
            />
          ) : (
            <div className={styles.readOnlyAction}>
              <Typography.Text type="secondary">{t('dashboard.start.active.readOnly')}</Typography.Text>
              <DashboardStartLink
                label={t('dashboard.openMonitors')}
                target={props.monitorListTarget}
                onNavigate={props.openMonitors}
              />
            </div>
          )
        }
      />
      <div className={styles.decision}>
        <ApiOutlined aria-hidden="true" />
        <Typography.Text>{t('dashboard.start.decision')}</Typography.Text>
      </div>
      <DashboardEntry
        kind="telemetry"
        title={t('dashboard.start.telemetry.title')}
        summary={t('dashboard.start.telemetry.summary')}
        flow={<TelemetryFlow />}
        outcomeTitle={t('dashboard.start.telemetry.outcomeTitle')}
        outcomes={[t('dashboard.start.telemetry.outcomeSignals'), t('dashboard.start.telemetry.outcomeDiagnosis')]}
        suitability={t('dashboard.start.telemetry.suitability')}
        action={
          <DashboardStartLink
            label={t('dashboard.start.telemetry.action')}
            target={props.telemetryTarget}
            onNavigate={props.openTelemetry}
          />
        }
      />
      <div className={styles.convergence}>
        <LinkOutlined aria-hidden="true" />
        <Typography.Text>{t('dashboard.start.convergence')}</Typography.Text>
      </div>
    </div>
  );
}

function DashboardEntry(props: {
  action: React.ReactNode;
  flow: React.ReactNode;
  kind: 'active-monitoring' | 'telemetry';
  outcomes: string[];
  outcomeTitle: string;
  suitability: string;
  summary: string;
  title: string;
}) {
  return (
    <section className={styles.entry} data-testid="dashboard-entry">
      <div className={styles.entryMain} data-testid={`${props.kind}-entry`}>
        <div className={styles.entryIdentity}>
          <Typography.Title level={2}>{props.title}</Typography.Title>
          <Typography.Paragraph>{props.summary}</Typography.Paragraph>
        </div>
        {props.flow}
        <div className={styles.outcome}>
          <Typography.Title level={3}>{props.outcomeTitle}</Typography.Title>
          {props.outcomes.map(outcome => (
            <Typography.Paragraph key={outcome}>{outcome}</Typography.Paragraph>
          ))}
        </div>
      </div>
      <footer className={styles.entryFooter}>
        <Typography.Text strong>{props.suitability}</Typography.Text>
        {props.action}
      </footer>
    </section>
  );
}

function ActiveMonitoringFlow() {
  const { t } = useTranslation();
  return (
    <div className={styles.flow} data-direction="forward" aria-label={t('dashboard.start.active.flowLabel')}>
      <ProductNode />
      <ArrowRightOutlined className={styles.direction} data-testid="flow-direction" aria-hidden="true" />
      <div className={styles.nodeGroup}>
        {activeTargets.map(([key, icon]) => (
          <TechnologyNode key={key} icon={icon} label={t(`dashboard.start.active.targets.${key}`)} />
        ))}
        <TechnologyNode icon={<GlobalOutlined />} label={t('dashboard.start.active.targets.http')} />
      </div>
    </div>
  );
}

function TelemetryFlow() {
  const { t } = useTranslation();
  return (
    <div className={styles.flow} data-direction="reverse" aria-label={t('dashboard.start.telemetry.flowLabel')}>
      <div className={styles.nodeGroup}>
        {telemetrySources.map(([key, icon]) => (
          <TechnologyNode key={key} icon={icon} label={t(`dashboard.start.telemetry.sources.${key}`)} />
        ))}
      </div>
      <ArrowRightOutlined className={styles.direction} data-testid="flow-direction" aria-hidden="true" />
      <ProductNode />
    </div>
  );
}

function ProductNode() {
  return <TechnologyNode icon="/assets/logo.svg" label="HertzBeat" />;
}

function TechnologyNode({ icon, label }: { icon: React.ReactNode | string; label: string }) {
  return (
    <div className={styles.technologyNode}>
      {typeof icon === 'string' ? (
        <img className={styles.technologyIcon} src={icon} alt="" aria-hidden="true" />
      ) : (
        <span className={styles.technologyIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <Typography.Text>{label}</Typography.Text>
    </div>
  );
}
