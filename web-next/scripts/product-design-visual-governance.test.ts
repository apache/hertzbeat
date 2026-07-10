import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const webNextRoot = resolve(__dirname, '..');

type SurfaceContract = {
  file: string;
  required: string[];
};

const highFrequencySurfaces: SurfaceContract[] = [
  {
    file: 'components/pages/entity-list-surface.tsx',
    required: [
      'data-entity-list-surface="otlp-hertzbeat-ui-entity-console"',
      'data-entity-list-table-shell="hertzbeat-ui-dense-table"'
    ]
  },
  {
    file: 'components/pages/entity-detail-surface.tsx',
    required: [
      'data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"',
      'data-entity-detail-signal-grid="hertzbeat-ui-detail-grid"'
    ]
  },
  {
    file: 'components/pages/entity-editor-surface.tsx',
    required: [
      'data-entity-editor-shell="otlp-hertzbeat-ui-entity-composer"',
      'data-entity-editor-frame="hertzbeat-ui-unframed-editor-band"'
    ]
  },
  {
    file: 'components/pages/entity-definition-workspace-surface.tsx',
    required: [
      'data-entity-definition-workspace-frame="hertzbeat-ui-unframed-workspace"',
      'data-entity-definition-editor-shell="otlp-hertzbeat-ui-definition-workbench"',
      'data-entity-definition-editor-shell="otlp-hertzbeat-ui-import-workbench"'
    ]
  },
  {
    file: 'app/monitors/monitor-manage-page.tsx',
    required: [
      'HzExplorerFrame',
      'data-monitor-manage-shell-owner="hertzbeat-ui-explorer-frame"'
    ]
  },
  {
    file: 'components/monitor-detail/monitor-detail-console.tsx',
    required: [
      'HzMonitorDetailWorkbenchFrame',
      'data-monitor-detail-console-shell-owner="hertzbeat-ui-detail-console-shell"'
    ]
  },
  {
    file: 'components/pages/alert-center-surface.tsx',
    required: [
      'data-alert-center-surface="otlp-hertzbeat-ui-center-console"',
      'data-alert-center-list-shell="hertzbeat-ui-alert-list"'
    ]
  },
  {
    file: 'components/pages/alert-setting-surface.tsx',
    required: [
      'data-alert-setting-surface="otlp-hertzbeat-ui-setting-console"',
      'data-alert-setting-table-shell="hertzbeat-ui-dense-table"'
    ]
  },
  {
    file: 'components/settings/settings-console-shell.tsx',
    required: [
      'data-settings-console-surface="hertzbeat-ui-settings-console"',
      'data-settings-console-main="hertzbeat-ui-settings-workspace"'
    ]
  },
  {
    file: 'components/pages/settings-surface-page.tsx',
    required: [
      'data-settings-surface-page-frame="hertzbeat-ui-unframed-workspace"',
      'data-settings-surface-page-header="hertzbeat-ui-compact-header"',
      'data-settings-surface-page-visual-contract="flat-settings-entry"'
    ]
  },
  {
    file: 'app/log/manage/log-manage-page.tsx',
    required: [
      'HzSignalWorkbenchShell',
      'data-log-manage-shell-owner="hertzbeat-ui-signal-workbench-shell"'
    ]
  },
  {
    file: 'app/trace/manage/trace-manage-page.tsx',
    required: [
      'HzSignalWorkbenchShell',
      'data-trace-manage-shell-owner="hertzbeat-ui-signal-workbench-shell"'
    ]
  },
  {
    file: 'app/actions/actions-page.tsx',
    required: [
      'HzActionWorkbench',
      'data-actions-shared-workbench="hertzbeat-ui"'
    ]
  },
  {
    file: 'app/incidents/incidents-page.tsx',
    required: [
      'HzIncidentWorkbench',
      'data-incidents-shared-workbench="hertzbeat-ui"'
    ]
  },
  {
    file: 'app/topology/topology-page.tsx',
    required: [
      'HzTopologyWorkbenchFrame',
      'data-topology-workbench-frame-owner="hertzbeat-ui-workbench-frame"'
    ]
  },
  {
    file: 'app/explorer/explorer-page.tsx',
    required: [
      'HzExplorerFrame',
      'data-explorer-shared-frame="hertzbeat-ui"'
    ]
  },
  {
    file: 'app/overview/overview-page.tsx',
    required: [
      'OverviewProblemFocusPanel',
      'data-overview-problem-focus-panel="hertzbeat-ui-flat-problem-focus"',
      'data-overview-problem-focus-owner="hertzbeat-ui-overview-console"'
    ]
  }
];

const legacyVisualMarkers = [
  'angular-dark-ops-placeholder',
  'angular-sidebar-flush',
  'signoz-services-table',
  'signoz-services-rail',
  'OpsSurfacePage',
  'WorkbenchPage',
  'StageSection',
  'DrawerSection',
  'SummaryMetricGrid',
  'data-cold-search-input-shell',
  'rounded-[16px]',
  'rounded-[14px]',
  'rounded-[12px]',
  'linear-gradient'
];

function readWebNext(file: string) {
  return readFileSync(resolve(webNextRoot, file), 'utf8');
}

describe('Product Design visual governance', () => {
  it('keeps the retired ops compatibility wrapper out of product surfaces', () => {
    expect(existsSync(resolve(webNextRoot, 'components/pages/ops-surface-page.tsx'))).toBe(false);
    expect(existsSync(resolve(webNextRoot, 'components/pages/ops-surface-page.test.tsx'))).toBe(false);
  });

  it('keeps the Product Design audit baseline on dark operations theme tokens', () => {
    const layoutSource = readWebNext('app/layout.tsx');
    const globalsSource = readWebNext('app/globals.css');

    expect(layoutSource).toContain('<body data-theme="dark-ops">');
    expect(layoutSource).not.toContain('<body data-theme="light-ops">');
    expect(layoutSource).not.toContain('data-theme="light"');
    expect(globalsSource).toContain('--background: 220 11% 5%;');
    expect(globalsSource).toContain('--ops-background: #0b0c0e;');
    expect(globalsSource).toContain("body[data-theme='light-ops']");
    expect(globalsSource.indexOf('--background: 220 11% 5%;')).toBeLessThan(
      globalsSource.indexOf("body[data-theme='light-ops']")
    );
  });

  it('keeps high-frequency operator workflows on shared HertzBeat UI surfaces', () => {
    highFrequencySurfaces.forEach(surface => {
      const source = readWebNext(surface.file);

      expect(source, `${surface.file} should have a HertzBeat UI owner`).toContain('hertzbeat-ui');
      surface.required.forEach(marker => {
        expect(source, `${surface.file} should keep ${marker}`).toContain(marker);
      });
    });
  });

  it('keeps high-frequency operator workflows free of legacy card-stack and marketing-shell markers', () => {
    highFrequencySurfaces.forEach(surface => {
      const source = readWebNext(surface.file);

      legacyVisualMarkers.forEach(marker => {
        expect(source, `${surface.file} should not contain ${marker}`).not.toContain(marker);
      });
    });
  });
});
