import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('alert surface cold-workbench chrome', () => {
  it('removes the remaining legacy table and checkbox chrome from the completed cold-matte alert slice', () => {
    const centerSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');
    const groupSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-group-surface.tsx'), 'utf8');
    const inhibitSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-surface.tsx'), 'utf8');
    const settingSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-setting-surface.tsx'), 'utf8');
    const silenceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-silence-surface.tsx'), 'utf8');
    const combinedSource = [centerSource, groupSource, inhibitSource, settingSource, silenceSource].join('\n');

    expect(combinedSource).not.toContain('rounded-[12px]');
    expect(combinedSource).not.toContain('rounded-[14px]');
    expect(combinedSource).not.toContain('border-white/6');
    expect(combinedSource).not.toContain('border-white/8');
    expect(combinedSource).not.toContain('border-white/10');
    expect(combinedSource).not.toContain('bg-black/20');
    expect(combinedSource).not.toContain('bg-white/[0.03]');
    expect(combinedSource).not.toContain('bg-white/[0.04]');
    expect(combinedSource).not.toContain('text-white/78');
    expect(combinedSource).not.toContain('text-white/62');
    expect(combinedSource).not.toContain('text-white/42');
    expect(combinedSource).not.toContain('text-[#f3eee6]');
    expect(combinedSource).not.toContain('text-[#e7dfd1]');
  });

  it('adopts the OTLP cold-matte visual owner on the completed center, group, inhibit, setting, and silence surfaces', () => {
    const centerSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');
    const groupSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-group-surface.tsx'), 'utf8');
    const inhibitSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-surface.tsx'), 'utf8');
    const settingSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-setting-surface.tsx'), 'utf8');
    const silenceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-silence-surface.tsx'), 'utf8');
    const completedColdSurfaces = [centerSource, groupSource, inhibitSource, settingSource, silenceSource];

    for (const source of completedColdSurfaces) {
      expect(source).toContain('hzOpsCatalogVisual');
      expect(source).not.toContain("from './alert-surface-primitives'");
      expect(source).not.toContain("from '../workbench/workbench-page'");
      expect(source).not.toContain('WorkbenchPage');
      expect(source).not.toContain('SurfaceSection');
      expect(source).not.toContain('RailSection');
      expect(source).not.toContain('AlertSurfaceTableShell');
      expect(source).not.toContain('AlertSurfaceTable');
      expect(source).not.toContain('AlertSurfaceCheckboxLabel');
      expect(source).not.toContain('angular-single-panel');
      expect(source).not.toContain('angular-density');
      expect(source).not.toContain('angular-table');
      expect(source).not.toContain('angular-table-panel');
      expect(source).not.toContain('angular-checkbox');
    }

    expect(centerSource).toContain('data-alert-center-surface="otlp-hertzbeat-ui-center-console"');
    expect(centerSource).toContain('data-alert-center-style-baseline={coldCenterVisual.canvasName}');
    expect(centerSource).toContain('data-alert-center-command-row="standard-equal-buttons"');
    expect(centerSource).toContain('data-alert-center-toolbar="hertzbeat-ui-query-toolbar"');
    expect(centerSource).toContain('data-alert-center-list-shell="hertzbeat-ui-alert-list"');
    expect(centerSource).toContain('data-alert-center-empty-state="hertzbeat-ui-table-empty"');

    expect(groupSource).toContain('data-alert-group-surface="otlp-hertzbeat-ui-group-console"');
    expect(groupSource).toContain('data-alert-group-style-baseline={coldGroupVisual.canvasName}');
    expect(groupSource).toContain('data-alert-group-command-row="standard-equal-buttons"');
    expect(groupSource).toContain('data-alert-group-toolbar="hertzbeat-ui-query-toolbar"');
    expect(groupSource).toContain('data-alert-group-table-shell="hertzbeat-ui-dense-table"');
    expect(groupSource).toContain('data-alert-group-empty-state="hertzbeat-ui-table-empty"');

    expect(inhibitSource).toContain('data-alert-inhibit-surface="otlp-hertzbeat-ui-inhibit-console"');
    expect(inhibitSource).toContain('data-alert-inhibit-style-baseline={coldInhibitVisual.canvasName}');
    expect(inhibitSource).toContain('data-alert-inhibit-command-row="standard-equal-buttons"');
    expect(inhibitSource).toContain('data-alert-inhibit-toolbar="hertzbeat-ui-query-toolbar"');
    expect(inhibitSource).toContain('data-alert-inhibit-table-shell="hertzbeat-ui-dense-table"');
    expect(inhibitSource).toContain('data-alert-inhibit-empty-state="hertzbeat-ui-table-empty"');

    expect(settingSource).toContain('data-alert-setting-surface="otlp-hertzbeat-ui-setting-console"');
    expect(settingSource).toContain('data-alert-setting-style-baseline={coldSettingVisual.canvasName}');
    expect(settingSource).toContain('data-alert-setting-command-row="standard-equal-buttons"');
    expect(settingSource).toContain('data-alert-setting-toolbar="hertzbeat-ui-query-toolbar"');
    expect(settingSource).toContain('data-alert-setting-table-shell="hertzbeat-ui-dense-table"');
    expect(settingSource).toContain('data-alert-setting-empty-state="hertzbeat-ui-table-empty"');

    expect(silenceSource).toContain('data-alert-silence-surface="otlp-hertzbeat-ui-silence-console"');
    expect(silenceSource).toContain('data-alert-silence-style-baseline={coldSilenceVisual.canvasName}');
    expect(silenceSource).toContain('data-alert-silence-command-row="standard-equal-buttons"');
    expect(silenceSource).toContain('data-alert-silence-toolbar="hertzbeat-ui-query-toolbar"');
    expect(silenceSource).toContain('data-alert-silence-table-shell="hertzbeat-ui-dense-table"');
    expect(silenceSource).toContain('data-alert-silence-empty-state="hertzbeat-ui-table-empty"');
  });
});
