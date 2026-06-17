import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('milestone 4 auth/public and settings cold-workbench chrome', () => {
  it('removes the remaining bright-shell residue from the current auth/settings slice', () => {
    const passportLockSource = readFileSync(resolve(process.cwd(), 'app/passport/lock/passport-lock-page.tsx'), 'utf8');
    const settingTokenSource = readFileSync(resolve(process.cwd(), 'app/setting/settings/token/setting-token-page.tsx'), 'utf8');
    const combinedSource = [passportLockSource, settingTokenSource].join('\n');

    expect(combinedSource).not.toContain('border-white/35');
    expect(combinedSource).not.toContain('bg-white/80');
    expect(combinedSource).not.toContain('bg-white/92');
    expect(combinedSource).not.toContain('text-[#465064]');
    expect(combinedSource).not.toContain('text-[#2f3a51]');
    expect(combinedSource).not.toContain('text-[#697180]');
    expect(combinedSource).not.toContain('border-[#c7ceda]');
    expect(combinedSource).not.toContain('border-[#d8899a]');
    expect(combinedSource).not.toContain('bg-[#fff1f3]/92');
    expect(combinedSource).not.toContain('text-[#8f1d37]');
    expect(combinedSource).not.toContain('rounded-[16px]');
    expect(combinedSource).not.toContain('text-rose-300');
  });

  it('adopts shared ops owners and danger states across the current auth/settings slice', () => {
    const passportLockRouteSource = readFileSync(resolve(process.cwd(), 'app/passport/lock/page.tsx'), 'utf8');
    const passportLockSource = readFileSync(resolve(process.cwd(), 'app/passport/lock/passport-lock-page.tsx'), 'utf8');
    const settingTokenSource = readFileSync(resolve(process.cwd(), 'app/setting/settings/token/setting-token-page.tsx'), 'utf8');

    expect(passportLockRouteSource).not.toMatch(/^['"]use client['"]/);
    expect(passportLockRouteSource).toContain("import PassportLockPage from './passport-lock-page'");
    expect(passportLockSource).toContain('HzPassportLockSurface');
    expect(passportLockSource).toContain('PassportPanel');
    expect(passportLockSource).not.toContain('components/workbench/primitives');
    expect(passportLockSource).toContain('border-[var(--ops-border-color)]');
    expect(passportLockSource).toContain('bg-[#101217]');
    expect(passportLockSource).toContain('data-passport-lock-panel="angular-wide"');
    expect(passportLockSource).toContain('data-passport-lock-panel-owner="hertzbeat-ui-passport-lock"');

    expect(settingTokenSource).toContain('SettingsConsoleTitle');
    expect(settingTokenSource).toContain('hzOpsCatalogVisual');
    expect(settingTokenSource).toContain('data-setting-token-table-panel="hertzbeat-ui-dense-table"');
    expect(settingTokenSource).toContain('data-setting-token-strip-style="hertzbeat-ui-inline-counts"');
    expect(settingTokenSource).toContain('data-setting-token-row-action="hertzbeat-ui-row-action"');
    expect(settingTokenSource).toContain('text-[#fca5a5]');
    expect(settingTokenSource).not.toContain('ObservabilityStatusState');
    expect(settingTokenSource).not.toContain('StageSection');
    expect(settingTokenSource).not.toContain('DrawerCodePreview');
    expect(settingTokenSource).not.toContain('SummaryMetricGrid');
    expect(settingTokenSource).not.toContain('PayloadPreview density="compact" className="mt-3"');
  });
});
