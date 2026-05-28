import path from 'node:path';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAlertIntegrationFallbackDocCopy, loadIntegrationDoc } from '@/lib/alert-integration/controller';
import {
  buildAlertIntegrationSourceHref,
  createAlertIntegrationTranslator,
  DATA_SOURCES,
  getIntegrationSource,
  getIntegrationSourceName
} from '@/lib/alert-integration/view-model';
import { normalizeLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { AlertIntegrationMarkdown } from '../../../../components/pages/alert-integration-markdown';
import { coldOpsCatalogVisual } from '../../../../lib/cold-ops-visual';

export default async function AlertIntegrationPage({ params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  const coldOpsVisual = coldOpsCatalogVisual;
  const selectedSource = getIntegrationSource(source.trim());
  if (selectedSource.id !== source) {
    redirect(buildAlertIntegrationSourceHref(selectedSource));
  }
  const requestHeaders = await headers();
  const locale = normalizeLocale(requestHeaders.get('accept-language'));
  const t = createAlertIntegrationTranslator(locale);
  const selectedSourceName = getIntegrationSourceName(selectedSource, t);
  const sourceRailLabel = t('alert.integration.sources');
  const baseDir = path.join(process.cwd(), '..', 'web-app', 'src', 'assets', 'doc', 'alert-integration');
  const doc = await loadIntegrationDoc(baseDir, selectedSource.id, locale);
  const fallbackDocCopy = getAlertIntegrationFallbackDocCopy(locale);

  return (
    <div
      data-alert-integration-surface="otlp-cold-source-doc"
      data-alert-integration-style-baseline={coldOpsVisual.canvasName}
      className="space-y-5 bg-[#0b0c0e] text-[#f2f5f8]"
    >
      <header className="grid gap-4 pb-1 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">
            {t('alert.integration.kicker')}
          </div>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight text-[#f5f7fb]">{selectedSourceName}</h1>
        </div>
        <div
          data-alert-integration-header-actions="cold-source-doc-actions"
          className={cn(coldOpsVisual.button.row, 'mt-0 xl:justify-end')}
        >
          <span className="hidden text-[11px] font-semibold text-[#7e8494] md:inline-flex">{sourceRailLabel}</span>
          <Link href="/setting/settings/token">
            <Button size="sm" variant="default" className={cn(coldOpsVisual.button.compact, 'rounded-[3px]')}>
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              {t('alert.integration.token.manage')}
            </Button>
          </Link>
        </div>
      </header>

      <div
        data-alert-integration-container="cold-source-doc-shell"
        className={cn(
          coldOpsVisual.radius.panel,
          'grid min-h-[640px] overflow-hidden border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)] xl:grid-cols-[220px_minmax(0,1fr)]'
        )}
      >
        <aside
          data-alert-integration-source-rail="cold-source-list"
          className="border-b border-[#252b34] bg-[#0b0c0e] px-3 py-4 xl:border-b-0 xl:border-r"
        >
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]">
            {sourceRailLabel}
          </h2>
          <nav className="space-y-1" aria-label={sourceRailLabel}>
            {DATA_SOURCES.map(item => {
              const selected = item.id === selectedSource.id;
              const sourceName = getIntegrationSourceName(item, t);
              return (
                <Link
                  key={item.id}
                  href={buildAlertIntegrationSourceHref(item)}
                  data-alert-integration-source-item={item.id}
                  data-alert-integration-source-selected={selected ? 'true' : undefined}
                  className={cn(
                    'flex h-9 items-center rounded-[3px] border px-2.5 text-[12px] font-semibold transition-colors',
                    selected
                      ? 'border-[#31405c] bg-[#182238] text-[#d8e4ff]'
                      : 'border-transparent text-[#858d9a] hover:border-[#303743] hover:bg-[#101217] hover:text-[#eef2f7]'
                  )}
                >
                  <img
                    src={item.icon}
                    alt={sourceName}
                    data-alert-integration-source-icon={item.id}
                    className="mr-2.5 h-5 w-5 shrink-0 object-contain"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate">{sourceName}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section data-alert-integration-doc-panel="cold-markdown-doc" className="min-w-0 overflow-y-auto px-6 py-5">
          <h2 className="mb-4 text-[22px] font-semibold leading-tight text-[#f5f7fb]">{selectedSourceName}</h2>
          {doc === fallbackDocCopy ? (
            <p data-alert-integration-markdown="rendered" className="text-[13px] leading-7 text-[#a9b0bb]">
              {doc}
            </p>
          ) : (
            <AlertIntegrationMarkdown content={doc} />
          )}
        </section>
      </div>
    </div>
  );
}
