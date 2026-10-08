/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { createElement, useContext } from 'react';
import { PersesTooltipTimestampContext } from '../runtime/perses-tooltip-context';

import { dynamicImportPluginLoader } from '@perses-dev/plugin-system';
import { LogsTable } from '@perses-dev/logs-table-plugin/lib/index.js';
import { StatChart } from '@perses-dev/stat-chart-plugin/lib/index.js';
import { GaugeChart } from '@perses-dev/gauge-chart-plugin/lib/index.js';
import { Table } from '@perses-dev/table-plugin/lib/index.js';
import type { PanelPlugin, PluginModuleResource } from '@perses-dev/plugin-system';
import { name as logName, version as logVersion, perses as logSpec } from '@perses-dev/logs-table-plugin/package.json';
import {
  name as statName,
  version as statVersion,
  perses as statSpec
} from '@perses-dev/stat-chart-plugin/package.json';
import {
  name as gaugeName,
  version as gaugeVersion,
  perses as gaugeSpec
} from '@perses-dev/gauge-chart-plugin/package.json';
import { name as tableName, version as tableVersion, perses as tableSpec } from '@perses-dev/table-plugin/package.json';
import {
  name as timeSeriesName,
  version as timeSeriesVersion,
  perses as timeSeriesSpec
} from '@perses-dev/timeseries-chart-plugin/package.json';
import {
  TimeSeriesChartPanel,
  createInitialTimeSeriesChartOptions,
  type TimeSeriesChartOptions,
  type TimeSeriesChartProps
} from '@perses-dev/timeseries-chart-plugin/lib/index.js';

import { hertzBeatSnapshotPluginModule } from './hertzbeat-snapshot-query';
import { hertzBeatSnapshotPlugin, withCompoundPluginKeys } from './perses-plugin-loader';

// This host renders evidence only; its Query form owns authoring and its panel header is hidden.
const timeSeriesRuntime: PanelPlugin<TimeSeriesChartOptions, TimeSeriesChartProps> = {
  PanelComponent: HostTimeSeriesChartPanel,
  supportedQueryTypes: ['TimeSeriesQuery'],
  createInitialOptions: createInitialTimeSeriesChartOptions
};

function HostTimeSeriesChartPanel(props: TimeSeriesChartProps) {
  const renderTimestamp = useContext(PersesTooltipTimestampContext);
  return createElement(TimeSeriesChartPanel, { ...props, ...(renderTimestamp ? { renderTimestamp } : {}) });
}

// Select only public registry metadata, not npm scripts/dependencies. Contract tests compare
// every resource field with the installed packages' official getPluginModule() results.
const timeSeriesResource = {
  kind: 'PluginModule',
  metadata: { name: timeSeriesName, version: timeSeriesVersion },
  spec: timeSeriesSpec
} as PluginModuleResource;
const logResource = {
  kind: 'PluginModule',
  metadata: { name: logName, version: logVersion },
  spec: logSpec
} as PluginModuleResource;
const statResource = {
  kind: 'PluginModule',
  metadata: { name: statName, version: statVersion },
  spec: statSpec
} as PluginModuleResource;
const gaugeResource = {
  kind: 'PluginModule',
  metadata: { name: gaugeName, version: gaugeVersion },
  spec: gaugeSpec
} as PluginModuleResource;
const tableResource = {
  kind: 'PluginModule',
  metadata: { name: tableName, version: tableVersion },
  spec: tableSpec
} as PluginModuleResource;

export const hertzBeatPersesMultiSignalPluginLoader = withCompoundPluginKeys(
  dynamicImportPluginLoader([
    {
      resource: hertzBeatSnapshotPluginModule,
      importPlugin: () => Promise.resolve(hertzBeatSnapshotPlugin)
    },
    {
      resource: timeSeriesResource,
      importPlugin: () => Promise.resolve({ TimeSeriesChart: timeSeriesRuntime })
    },
    {
      resource: logResource,
      importPlugin: () => Promise.resolve({ LogsTable })
    },
    { resource: statResource, importPlugin: () => Promise.resolve({ StatChart }) },
    { resource: gaugeResource, importPlugin: () => Promise.resolve({ GaugeChart }) },
    { resource: tableResource, importPlugin: () => Promise.resolve({ Table }) }
  ])
);
