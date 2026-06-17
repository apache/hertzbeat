import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings family cold-matte chrome', () => {
  it('replaces old settings shell literals with the cold settings contract', () => {
    const settingsShellSource = readFileSync(resolve(process.cwd(), 'components/settings/settings-console-shell.tsx'), 'utf8');
    const settingsFormSource = readFileSync(resolve(process.cwd(), 'components/settings/settings-form.tsx'), 'utf8');
    const settingsSummarySource = readFileSync(resolve(process.cwd(), 'components/settings/settings-summary-list.tsx'), 'utf8');
    const settingsDialogSource = readFileSync(resolve(process.cwd(), 'components/settings/settings-dialog-form.tsx'), 'utf8');
    const combinedSource = [settingsShellSource, settingsFormSource, settingsSummarySource, settingsDialogSource].join('\n');

    expect(combinedSource).toContain('hzOpsCatalogVisual');
    expect(combinedSource).toContain('data-settings-console-style-baseline');
    expect(combinedSource).toContain('data-settings-form-owner="cold-settings-form-owner"');
    expect(combinedSource).toContain('data-settings-summary-list-style="cold-dense-summary-list"');
    expect(combinedSource).toContain('data-settings-dialog-control="cold-select-control"');
    expect(combinedSource).toContain('border-[#2b3039]');
    expect(combinedSource).toContain('bg-[#0b0c0e]');
    expect(combinedSource).toContain('bg-[#101217]');
    expect(combinedSource).toContain('text-[#dbe4f0]');
    expect(combinedSource).toContain('text-[#a9b0bb]');
    expect(combinedSource).not.toContain('var(--ops-surface-raised)');
    expect(combinedSource).not.toContain('#20232b');
    expect(combinedSource).not.toContain('#121317');
    expect(combinedSource).not.toContain('#111317');
    expect(combinedSource).not.toContain('#eef2f6');
    expect(combinedSource).not.toContain('text-white/68');
    expect(combinedSource).not.toContain('text-white/66');
  });

  it('adopts cold shared surfaces across the settings route family', () => {
    const settingsSurfaceSource = readFileSync(resolve(process.cwd(), 'components/pages/settings-surface-page.tsx'), 'utf8');
    const collectorSource = readFileSync(resolve(process.cwd(), 'components/pages/collector-manage-surface.tsx'), 'utf8');
    const pluginSource = readFileSync(resolve(process.cwd(), 'components/pages/plugin-manage-surface.tsx'), 'utf8');
    const labelSource = readFileSync(resolve(process.cwd(), 'components/pages/label-manage-surface.tsx'), 'utf8');
    const defineSource = readFileSync(resolve(process.cwd(), 'components/pages/setting-define-surface.tsx'), 'utf8');
    const statusSource = readFileSync(resolve(process.cwd(), 'components/pages/status-setting-surface.tsx'), 'utf8');
    const tokenSource = readFileSync(resolve(process.cwd(), 'app/setting/settings/token/setting-token-page.tsx'), 'utf8');

    expect(settingsSurfaceSource).toContain('variant="flat"');

    expect(collectorSource).toContain("from '../ui/search-row'");
    expect(collectorSource).toContain('data-collector-search-owner="shared-search-row"');
    expect(collectorSource).toContain('inputWidthClassName="w-[360px]"');
    expect(collectorSource).toContain('data-collector-table-shell="hertzbeat-ui-dense-table"');
    expect(collectorSource).not.toContain('coldCollectorVisual.search.row');
    expect(collectorSource).not.toContain('coldCollectorVisual.search.input');
    expect(collectorSource).not.toContain('WorkbenchTableFrame');

    expect(pluginSource).toContain('data-plugin-manage-style-baseline={coldPluginVisual.canvasName}');
    expect(pluginSource).toContain('data-plugin-manage-table-shell="hertzbeat-ui-dense-table"');
    expect(pluginSource).not.toContain('WorkbenchTableFrame');

    expect(labelSource).toContain('data-label-manage-style-baseline={coldLabelVisual.canvasName}');
    expect(labelSource).toContain('data-label-card-grid-contract="angular-card-grid"');
    expect(labelSource).toContain('data-label-card-grid-owner="hertzbeat-ui-label-tag"');
    expect(labelSource).not.toContain('data-label-table-shell="hertzbeat-ui-dense-table"');
    expect(defineSource).toContain('data-setting-define-style-baseline={coldDefineVisual.canvasName}');
    expect(defineSource).toContain('data-setting-define-workspace="cold-define-workspace"');
    expect(defineSource).toContain('HzYamlWorkspace');
    expect(defineSource).not.toContain("from '../ui/search-row'");
    expect(defineSource).not.toContain('data-setting-define-search-owner="shared-search-row"');
    expect(defineSource).not.toContain('coldDefineVisual.search.row');
    expect(defineSource).not.toContain('coldDefineVisual.search.input');
    expect(statusSource).toContain('data-status-setting-style-baseline={coldStatusVisual.canvasName}');
    expect(statusSource).toContain('data-status-admin-layout="full-width-admin-list"');
    expect(statusSource).toContain("from '../ui/search-row'");
    expect(statusSource).toContain('data-status-incident-search-owner="shared-search-row"');
    expect(statusSource).not.toContain('coldStatusVisual.search.row');
    expect(statusSource).not.toContain('coldStatusVisual.search.input');
    expect(statusSource).toContain('data-status-component-table-shell="hertzbeat-ui-dense-table"');
    expect(statusSource).toContain('data-status-incident-table-shell="hertzbeat-ui-dense-table"');
    expect(tokenSource).toContain('data-setting-token-style-baseline={coldTokenVisual.canvasName}');
    expect(tokenSource).toContain('data-setting-token-table-panel="hertzbeat-ui-dense-table"');
    expect(tokenSource).not.toContain('components/workbench/primitives');
  });
});
