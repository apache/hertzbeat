'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@/components/providers/i18n-provider';
import { buttonVariants } from '@/components/ui/button';
import { RailSection, StatusState, SurfaceSection } from '../workbench/primitives';
import { buildOpsFacts, buildOpsStatusRows } from '@/lib/ops-surface/view-model';
import { RowList, WorkbenchPage } from '@/components/workbench/workbench-page';

type SurfaceRow = {
  title: string;
  copy: string;
  meta?: string;
};

type SurfaceAction = {
  label: string;
  href: string;
  variant?: 'default' | 'primary' | 'subtle';
};

export function OpsSurfacePage({
  title,
  subtitle,
  tags,
  focus,
  summary,
  lanes,
  checklist,
  actions
}: {
  title: string;
  subtitle: string;
  tags: string[];
  focus: string;
  summary: string;
  lanes: SurfaceRow[];
  checklist: SurfaceRow[];
  actions?: SurfaceAction[];
}) {
  const { t } = useI18n();
  const headerActions = actions?.length
    ? actions.map(action => (
        <Link key={`${title}-${action.href}`} className={buttonVariants({ variant: action.variant ?? 'subtle', size: 'sm' })} href={action.href}>
          {action.label}
        </Link>
      ))
    : (
        <>
          <Link className={buttonVariants({ variant: 'subtle', size: 'sm' })} href="/overview">
            {t('menu.dashboard.back')}
          </Link>
          <Link className={buttonVariants({ variant: 'primary', size: 'sm' })} href="/entities">
            {t('menu.entity.browse')}
          </Link>
        </>
      );

  return (
    <WorkbenchPage
      kicker={t('ops.surface.kicker')}
      title={title}
      subtitle={subtitle}
      tone="operator"
      facts={buildOpsFacts(title, focus, tags, t)}
      actions={headerActions}
      main={
        <>
          <SurfaceSection title={title} copy={summary}>
            <RowList rows={lanes} />
          </SurfaceSection>
          <SurfaceSection
            title={t('ops.surface.route-contract.title')}
            copy={t('ops.surface.route-contract.copy')}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {buildOpsStatusRows(t).map(row => (
                <StatusState key={row.title} title={row.title} copy={row.copy} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  className="rounded-full border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]"
                  key={`${title}-${tag}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </SurfaceSection>
        </>
      }
      side={
        <>
          <RailSection title={t('ops.surface.launch-checklist')}>
            <RowList rows={checklist} />
          </RailSection>
          <RailSection title={t('ops.surface.route-posture')}>
            <div className="space-y-3">
              <div className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3.5 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ops-text-tertiary)]">{t('common.mode')}</div>
                <div className="mt-2 text-base font-semibold text-[var(--ops-text-primary)]">{t('ops.surface.entry-shell')}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--ops-text-secondary)]">{focus}</div>
              </div>
              <Link className={buttonVariants({ variant: 'default', size: 'sm' })} href="/overview">
                {t('menu.dashboard.back-en')}
              </Link>
            </div>
          </RailSection>
        </>
      }
    />
  );
}
