'use client';

import React from 'react';
import { useI18n } from '@/components/providers/i18n-provider';
import { SurfaceSection } from '@/components/workbench/primitives';
import {
  buildPlatformGovernanceRows,
  buildSettingsFacts,
  buildSettingsRows
} from '@/lib/settings-surface/view-model';
import { RowList } from '@/components/workbench/workbench-page';

function SettingsSurfaceFrame({
  kicker,
  title,
  subtitle,
  facts,
  children
}: {
  kicker: string;
  title: string;
  subtitle: string;
  facts: Array<{ label: string; value: string }>;
  children: React.ReactNode;
}) {
  return (
    <section
      data-settings-surface-page-frame="hertzbeat-ui-unframed-workspace"
      data-settings-surface-page-header="hertzbeat-ui-compact-header"
      data-settings-surface-page-visual-contract="flat-settings-entry"
      className="grid min-w-0 gap-4"
    >
      <header className="p-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]">{kicker}</div>
        <h1 className="mt-2 text-[24px] font-semibold leading-8 text-[var(--ops-text-primary)]">{title}</h1>
        <p className="mt-2 max-w-4xl text-[12px] leading-5 text-[var(--ops-text-secondary)]">{subtitle}</p>
        <div data-settings-surface-page-facts="hertzbeat-ui-inline-facts" className="mt-3 flex flex-wrap gap-2">
          {facts.map(fact => (
            <span
              key={`${fact.label}-${fact.value}`}
              className="rounded-[3px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 text-[11px] text-[var(--ops-text-secondary)]"
            >
              <span className="font-semibold text-[var(--ops-text-tertiary)]">{fact.label}</span>
              <span className="ml-2 text-[var(--ops-text-primary)]">{fact.value}</span>
            </span>
          ))}
        </div>
      </header>
      {children}
    </section>
  );
}

export function SettingsSurfacePage({
  title,
  subtitle,
  nextStep
}: {
  title: string;
  subtitle: string;
  nextStep: string;
}) {
  const { t } = useI18n();

  return (
    <SettingsSurfaceFrame
      kicker={t('menu.settings')}
      title={title}
      subtitle={subtitle}
      facts={buildSettingsFacts(title, nextStep, t)}
    >
      <div className="space-y-3">
        <SurfaceSection
          title={t('settings.surface.title')}
          copy={t('settings.surface.copy')}
          variant="flat"
        >
          <RowList rows={buildSettingsRows(t)} />
        </SurfaceSection>
        <SurfaceSection
          title={t('settings.surface.governance.title')}
          copy={t('settings.surface.governance.copy')}
          variant="flat"
        >
          <RowList rows={buildPlatformGovernanceRows(t)} />
        </SurfaceSection>
      </div>
    </SettingsSurfaceFrame>
  );
}
