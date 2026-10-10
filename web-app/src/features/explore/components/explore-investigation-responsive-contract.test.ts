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

import { describe, expect, it } from 'vitest';

import appStyles from '@/app/styles.css?raw';

import traceStyles from './explore-investigation-trace.module.css?raw';
import traceWorkspaceStyles from './explore-trace-workspace.module.css?raw';
import viewStyles from './explore-investigation-view.module.css?raw';
import attributeStyles from './otlp-attribute-list.module.css?raw';
import inspectorStyles from './explore-log-inspector.module.css?raw';
import queryStyles from './explore-query-bar.module.css?raw';
import historyStyles from './explore-history-result.module.css?raw';
import logStyles from './log-result.module.css?raw';
import legendStyles from './log-severity-legend.module.css?raw';
import resultFrameStyles from './signal-result-frame.module.css?raw';
import workspaceStyles from './explore-workbench.module.css?raw';
import persesStyles from '@/platform/perses/runtime/hertzbeat-perses-primitives.module.css?raw';
import { createHertzBeatPersesTheme } from '@/platform/perses/runtime/hertzbeat-perses-theme';

describe('Explore investigation responsive contract', () => {
  it('keeps the workbench and Inspector JSON transparent above the single opaque Inspector surface', () => {
    expect(workspaceStyles).toMatch(/\.workspace\s*\{[^}]*background:\s*transparent/s);
    expect(inspectorStyles).toMatch(/\.json\s*\{[^}]*background:\s*transparent/s);
    expect(inspectorStyles).not.toContain('--hb-bg-base');
    expect(inspectorStyles).toMatch(/\.inspector\s*\{[^}]*background:\s*var\(--hb-bg-raised\)/s);
  });
  it('shares readable attribute columns without a fixed key-column floor in narrow Inspectors', () => {
    expect(attributeStyles).toMatch(/grid-template-columns:\s*minmax\(0,\s*36%\)\s+minmax\(0,\s*1fr\)/);
    expect(attributeStyles).not.toContain('180px');
    expect(attributeStyles).toMatch(/\.section\s*\{[^}]*margin-top:\s*12px/s);
    expect(attributeStyles).toContain('overflow-wrap: anywhere');
    expect(traceStyles).toMatch(/\.selectedSpan\s*\{[^}]*gap:\s*0[^}]*padding-top:\s*0/s);
  });
  it('uses the shared focus token for the inline trace Inspector', () => {
    expect(traceStyles).not.toContain('--hb-surface-container');
    expect(traceWorkspaceStyles).not.toContain('--hb-surface-container');
    expect(traceStyles).toContain('var(--hb-focus-ring)');
    expect(appStyles).toContain('--hb-focus-ring:');
  });
  it('stacks a bounded waterfall above the full-width Inspector without another mobile overlay', () => {
    expect(traceStyles).toMatch(/\.tracePrimary\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
    expect(traceStyles).toContain('height: min(360px, calc(96px + var(--trace-row-count) * 32px))');
    expect(traceStyles).toMatch(/\.tracePrimary\s*>\s*\.ganttRuntime\[data-variant='fill'\]\s*\{[^}]*flex:\s*none/s);
    expect(traceStyles).toMatch(/\.spanInspector,[\s\S]*border-top:\s*1px solid/s);
    expect(traceStyles).not.toMatch(/grid-template-columns:[^;]*340px/);
    expect(traceStyles).not.toMatch(/\.inspectorSlot\s*\{[^}]*position:\s*absolute/s);
  });

  it('keeps Trace context and availability in one wrapping strip without a redundant ready heading', () => {
    expect(traceWorkspaceStyles).toMatch(/\.contextStrip\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/s);
    expect(traceWorkspaceStyles).toMatch(/:has\(\[data-trace-waterfall\]\)\s*>\s*header\s*\{[^}]*display:\s*none/s);
    expect(traceStyles).toMatch(/\.inspectorSlot\s*\{[^}]*min-height:\s*0/s);
  });

  it('removes secondary shell summaries only from a narrow focused investigation header', () => {
    expect(viewStyles).toMatch(
      /@media \(max-width:\s*768px\)[\s\S]*body:has\(\[data-explore-investigation='true'\]\)[\s\S]*\[data-testid='shell-time-policy'\][\s\S]*\[data-testid='shell-status-greptime'\][\s\S]*\[data-testid='shell-status-collector'\][\s\S]*\{[^}]*display:\s*none/s
    );
    expect(viewStyles).not.toMatch(/\[data-testid='shell-status-server'\]/);
  });

  it('contains ordinary Explore through tablet width', () => {
    expect(workspaceStyles).toMatch(
      /body:has\(\[data-explore-workspace='true'\]\)[\s\S]*\[data-testid='shell-time-policy'\][\s\S]*\[data-testid='shell-status-greptime'\][\s\S]*\[data-testid='shell-status-collector'\][\s\S]*display:\s*none/s
    );
    expect(workspaceStyles).not.toMatch(/\[data-testid='shell-status-server'\]/);
    expect(queryStyles).toMatch(/@media \(max-width:\s*700px\)[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
    expect(queryStyles).toMatch(
      /@media \(max-width:\s*1000px\)[\s\S]*\.logCommandFields\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s
    );
    expect(queryStyles).toMatch(/\.commandFields,\s*\.logCommandFields\s*\{[^}]*display:\s*flex/s);
    expect(queryStyles).toMatch(/\.commandFields\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(queryStyles).toMatch(
      /\.toolbarField\[data-log-command-slot='time'\]\s*\{[^}]*flex:\s*1\s+1\s+510px[^}]*min-width:\s*min\(100%,\s*510px\)/s
    );
    expect(queryStyles).not.toMatch(
      /@media \(max-width:\s*700px\)[\s\S]*\.commandFields,\s*\.commandActions\s*\{[^}]*flex-direction:\s*column/s
    );
  });

  it('keeps Logs overview, trend, and result on flat full-width workbench surfaces', () => {
    expect(logStyles).toMatch(/\.statistics\s*\{[^}]*flex-direction:\s*column/s);
    expect(logStyles).not.toMatch(/\.statistics\s*\{[^}]*margin-bottom:\s*[1-9]/s);
    expect(logStyles).toMatch(/\.trendHeader\s*\{[^}]*min-height:\s*28px/s);
    expect(logStyles).toMatch(/\.trend\[data-trend-density='compact'\]\s*\{[^}]*min-height:\s*32px/s);
    expect(logStyles).toMatch(/\.trend\[data-trend-density='visualization'\]\s*\{[^}]*min-height:\s*140px/s);
    expect(logStyles).not.toMatch(/\.statistics\s*>\s*section\s*\{[^}]*border-bottom:/s);
    expect(logStyles).not.toMatch(/\.statistics\s*>\s*section\s*\{[^}]*border-radius:/s);
    expect(logStyles).not.toMatch(/\.statistics\s*\{[^}]*grid-template-columns:/s);
    expect(historyStyles).toMatch(/\.logRegion\s*\{[^}]*padding-block:\s*0/s);
    expect(historyStyles).toMatch(/\.logRegion\s*\+\s*\.logRegion\s*\{[^}]*border-top:\s*1px solid/s);
    expect(resultFrameStyles).toMatch(/\.header\s*\{[^}]*min-height:\s*var\(--hb-workbench-header-height\)/s);
    expect(resultFrameStyles).toMatch(
      /\.frame\[data-meta-presentation='compact'\]\s+\.meta\s+dt\s*\{[^}]*font-size:\s*11px/s
    );
    expect(resultFrameStyles).not.toMatch(
      /\.frame\[data-meta-presentation='compact'\]\s+\.meta\s+dt\s*\{[^}]*position:\s*absolute/s
    );
  });

  it('uses one shared workbench rhythm for Logs controls and region headers', () => {
    expect(appStyles).toMatch(/--hb-workbench-control-height:\s*32px/s);
    expect(appStyles).toMatch(/--hb-workbench-header-height:\s*36px/s);
    expect(queryStyles).toMatch(/\.form\s+:global\(\[data-hb-operational-command-bar\]\)\s*\{[^}]*align-items:\s*end/s);
    expect(queryStyles).toMatch(/\.form\s+:global\(\.ant-btn\)[\s\S]*height:\s*var\(--hb-workbench-control-height\)/s);
  });

  it('flattens embedded Perses panels and has no duplicate host action sidecar', () => {
    const components = createHertzBeatPersesTheme('dark').components;
    expect(components?.MuiCard).toMatchObject({
      styleOverrides: {
        root: { border: 0, borderRadius: 0, backgroundColor: 'transparent', boxShadow: 'none' }
      }
    });
    expect(components?.MuiCardContent).toMatchObject({ styleOverrides: { root: { padding: 0 } } });
    expect(persesStyles).not.toMatch(/\.Mui(?:Card|Paper|Box)-root/);
    expect(persesStyles).not.toMatch(/\.interactions|\.interactionList/);
  });

  it('keeps narrow Logs readable without a fixed table floor or page-level horizontal scrolling', () => {
    expect(historyStyles).toMatch(/\.persesFrame\s*\{[^}]*min-width:\s*0[^}]*overflow:\s*hidden/s);
    expect(persesStyles).toMatch(
      /\.runtime:has\(>\s*:global\(\[data-perses-primitive='logs-table'\]\)\)\s*\{[^}]*overflow-x:\s*hidden/s
    );
    expect(persesStyles).not.toMatch(/min-width:\s*640px/);
    expect(persesStyles).toMatch(
      /@media \(width <= 420px\)[\s\S]*grid-template-rows:\s*auto\s+auto[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content/s
    );
    expect(persesStyles).toMatch(
      /@media \(width <= 420px\)[\s\S]*data-hertzbeat-log-severity[\s\S]*grid-row:\s*1[\s\S]*grid-column:\s*2/s
    );
    expect(persesStyles).toMatch(/data-hertzbeat-log-severity[\s\S]*max-width:\s*12ch/s);
    expect(persesStyles).toMatch(
      /@media \(width <= 420px\)[\s\S]*div:last-of-type\)\s*\{[^}]*grid-row:\s*2[^}]*grid-column:\s*1\s*\/\s*-1/s
    );
    expect(persesStyles).toMatch(/button:focus-visible\)[\s\S]*opacity:\s*1\s*!important/s);
  });

  it('keeps the narrow Query command groups ordered and raises mobile controls to 36px', () => {
    expect(queryStyles).toMatch(
      /@media \(max-width:\s*1000px\)[\s\S]*\.logCommandFields\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s
    );
    expect(queryStyles).toMatch(
      /@media \(max-width:\s*700px\)[\s\S]*data-hb-operational-command-bar[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s
    );
    expect(queryStyles).toMatch(
      /@media \(max-width:\s*700px\)[\s\S]*\.form\s+:global\(\.ant-btn\)[\s\S]*min-height:\s*36px/s
    );
    expect(queryStyles).toMatch(
      /@media \(max-width:\s*360px\)[\s\S]*\.logCommandFields\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s
    );
    expect(workspaceStyles).toMatch(
      /\.signal:focus-visible,[\s\S]*\.activeSignal:focus-visible\s*\{[^}]*outline:\s*2px solid/s
    );
  });

  it('gives runtime and completeness independent grid rows', () => {
    expect(persesStyles).toMatch(/\.primitive\s*\{[^}]*grid-template-rows:\s*360px\s+auto;/s);
    expect(persesStyles).toMatch(
      /\.primitive\[data-variant='compact'\]\s*\{[^}]*min-height:\s*var\(--hb-perses-compact-height, 84px\)[^}]*grid-template-rows:\s*var\(--hb-perses-compact-height, 84px\)\s+auto;/s
    );
    expect(persesStyles).toMatch(
      /\.primitive\[data-variant='compact'\]\s+\.runtime,[\s\S]*height:\s*var\(--hb-perses-compact-height, 84px\)[^}]*min-height:\s*var\(--hb-perses-compact-height, 84px\)/s
    );
  });

  it('keeps focused signal facts flat inside their single outer surface', () => {
    expect(viewStyles).toMatch(/\.signalSection\s*\{[^}]*border:\s*1px solid[^}]*border-radius:/s);
    expect(viewStyles).toMatch(/\.fact\s*\{[^}]*border-bottom:\s*1px solid/s);
    expect(viewStyles).not.toMatch(/\.fact\s*\{[^}]*border:\s*1px solid/s);
    expect(viewStyles).not.toMatch(/\.fact\s*\{[^}]*border-radius:/s);
  });

  it('uses tabular figures for ordinary Logs overview and result counts', () => {
    expect(legendStyles).toMatch(/font-variant-numeric:\s*tabular-nums/s);
    expect(queryStyles).toMatch(/\.commandFields,\s*\.logCommandFields\s*\{[^}]*min-width:\s*0/s);
    expect(resultFrameStyles).toMatch(/\.identity\s+span\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s);
  });
});
