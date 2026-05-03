'use client';

import React from 'react';
import { useI18n } from '@/components/providers/i18n-provider';
import { SurfaceSection } from '@/components/workbench/primitives';
import {
  buildPlatformGovernanceRows,
  buildSettingsFacts,
  buildSettingsRows
} from '@/lib/settings-surface/view-model';
import { RowList, WorkbenchPage } from '@/components/workbench/workbench-page';

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
    <WorkbenchPage
      kicker={t('menu.settings')}
      title={title}
      subtitle={subtitle}
      tone="operator"
      facts={buildSettingsFacts(title, nextStep, t)}
      main={
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
            <RowList rows={buildPlatformGovernanceRows()} />
          </SurfaceSection>
        </div>
      }
    />
  );
}
