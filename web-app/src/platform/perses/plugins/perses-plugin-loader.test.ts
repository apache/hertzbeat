/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createElement } from 'react';
import { render, cleanup } from '@testing-library/react';
import { PersesTooltipTimestampContext } from '../runtime/perses-tooltip-context';
import type { PanelPlugin } from '@perses-dev/plugin-system';
import type { TimeSeriesChartOptions, TimeSeriesChartProps } from '@perses-dev/timeseries-chart-plugin/lib/index.js';
import { getPluginModuleCompoundKey } from '@perses-dev/plugin-system';
import { LogsTable, getPluginModule as getLogsModule } from '@perses-dev/logs-table-plugin/lib/index.js';
import { StatChart, getPluginModule as getStatModule } from '@perses-dev/stat-chart-plugin/lib/index.js';
import { GaugeChart, getPluginModule as getGaugeModule } from '@perses-dev/gauge-chart-plugin/lib/index.js';
import { Table, getPluginModule as getTableModule } from '@perses-dev/table-plugin/lib/index.js';
import {
  TimeSeriesChart,
  TimeSeriesChartPanel,
  createInitialTimeSeriesChartOptions,
  getPluginModule as getTimeSeriesModule
} from '@perses-dev/timeseries-chart-plugin/lib/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@perses-dev/timeseries-chart-plugin/lib/index.js', async original => ({
  ...(await original<typeof import('@perses-dev/timeseries-chart-plugin/lib/index.js')>()),
  TimeSeriesChartPanel: vi.fn(() => null)
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

import {
  HERTZBEAT_SNAPSHOT_LOG_QUERY_KIND,
  HERTZBEAT_SNAPSHOT_QUERY_KIND,
  HertzBeatSnapshotLogQuery,
  HertzBeatSnapshotTimeSeriesQuery
} from './hertzbeat-snapshot-query';
import { hertzBeatPersesMultiSignalPluginLoader } from './perses-multi-signal-plugin-loader';

describe('HertzBeat Perses plugin loader', () => {
  it('preserves the complete official plugin resources from installed package metadata', async () => {
    const resources = await hertzBeatPersesMultiSignalPluginLoader.getInstalledPlugins();
    expect(resources[1]).toEqual(getTimeSeriesModule());
    expect(resources[2]).toEqual(getLogsModule());
    expect(resources[3]).toEqual(getStatModule());
    expect(resources[4]).toEqual(getGaugeModule());
    expect(resources[5]).toEqual(getTableModule());
  });

  it('delegates unchanged panel props and optional timestamp context to the official renderer', async () => {
    const resources = await hertzBeatPersesMultiSignalPluginLoader.getInstalledPlugins();
    const module = (await hertzBeatPersesMultiSignalPluginLoader.importPluginModule(resources[1]!)) as {
      TimeSeriesChart: PanelPlugin<TimeSeriesChartOptions, TimeSeriesChartProps>;
    };
    expect(module.TimeSeriesChart.supportedQueryTypes).toEqual(TimeSeriesChart.supportedQueryTypes);
    expect(module.TimeSeriesChart.createInitialOptions).toBe(createInitialTimeSeriesChartOptions);
    const props: TimeSeriesChartProps = {
      spec: { tooltip: { enablePinning: true } },
      contentDimensions: { width: 800, height: 300 },
      queryResults: []
    };
    const Panel = module.TimeSeriesChart.PanelComponent;
    const view = render(createElement(Panel, props));
    expect(vi.mocked(TimeSeriesChartPanel).mock.lastCall?.[0]).toEqual(props);
    const renderTimestamp = (timestamp: number) => `Actual source timestamp: ${timestamp}`;
    view.rerender(
      createElement(PersesTooltipTimestampContext.Provider, { value: renderTimestamp }, createElement(Panel, props))
    );
    expect(vi.mocked(TimeSeriesChartPanel).mock.lastCall?.[0]).toEqual({ ...props, renderTimestamp });
    view.rerender(createElement(Panel, props));
    expect(vi.mocked(TimeSeriesChartPanel).mock.lastCall?.[0]).toEqual(props);
  });

  it('registers no obsolete trace panels or query bridge for directly rendered native trace components', async () => {
    const resources = await hertzBeatPersesMultiSignalPluginLoader.getInstalledPlugins();
    expect(resources.map(resource => resource.metadata.name)).toEqual([
      'hertzbeat-perses-runtime',
      '@perses-dev/timeseries-chart-plugin',
      '@perses-dev/logs-table-plugin',
      '@perses-dev/stat-chart-plugin',
      '@perses-dev/gauge-chart-plugin',
      '@perses-dev/table-plugin'
    ]);
    expect(resources[0]!.spec.plugins.map(plugin => plugin.kind)).toEqual(['TimeSeriesQuery', 'LogQuery']);
  });

  it('registers the snapshot bridges and official panels still used by the multi-signal runtime', async () => {
    // Importing LogsTable is also the packaging regression contract for 0.3.0.
    // Its pnpm patch restores ansiColors.css verbatim from the same version's
    // __mf/css/async/__federation_expose_LogsTable.eedb54d8.css and adds only
    // the trailing POSIX newline expected for a source file.
    const resources = await hertzBeatPersesMultiSignalPluginLoader.getInstalledPlugins();
    expect(resources.map(resource => resource.metadata.name)).toEqual([
      'hertzbeat-perses-runtime',
      '@perses-dev/timeseries-chart-plugin',
      '@perses-dev/logs-table-plugin',
      '@perses-dev/stat-chart-plugin',
      '@perses-dev/gauge-chart-plugin',
      '@perses-dev/table-plugin'
    ]);

    const snapshotResource = resources[0]!;
    const loaded = (await hertzBeatPersesMultiSignalPluginLoader.importPluginModule(snapshotResource)) as Record<
      string,
      unknown
    >;
    const compoundKey = getPluginModuleCompoundKey({
      kind: 'TimeSeriesQuery',
      name: HERTZBEAT_SNAPSHOT_QUERY_KIND,
      version: '2.0.0'
    });
    expect(loaded[compoundKey]).toBe(HertzBeatSnapshotTimeSeriesQuery);
    expect(
      loaded[
        getPluginModuleCompoundKey({
          kind: 'LogQuery',
          name: HERTZBEAT_SNAPSHOT_LOG_QUERY_KIND,
          version: '2.0.0'
        })
      ]
    ).toBe(HertzBeatSnapshotLogQuery);
    const timeSeriesResource = resources[1]!;
    const timeSeriesModule = (await hertzBeatPersesMultiSignalPluginLoader.importPluginModule(
      timeSeriesResource
    )) as Record<string, unknown>;
    const timeSeriesCompoundKey = getPluginModuleCompoundKey({
      kind: 'Panel',
      name: 'TimeSeriesChart',
      version: '0.13.0'
    });
    expect(timeSeriesModule[timeSeriesCompoundKey]).toBe(timeSeriesModule.TimeSeriesChart);

    const panelCases = [
      { resource: resources[2]!, name: 'LogsTable', version: '0.3.0', implementation: LogsTable },
      { resource: resources[3]!, name: 'StatChart', version: '0.14.0', implementation: StatChart },
      { resource: resources[4]!, name: 'GaugeChart', version: '0.13.0', implementation: GaugeChart },
      { resource: resources[5]!, name: 'Table', version: '0.13.0', implementation: Table }
    ];
    for (const panel of panelCases) {
      const module = (await hertzBeatPersesMultiSignalPluginLoader.importPluginModule(panel.resource)) as Record<
        string,
        unknown
      >;
      expect(module[getPluginModuleCompoundKey({ kind: 'Panel', name: panel.name, version: panel.version })]).toBe(
        panel.implementation
      );
    }
  });
});
