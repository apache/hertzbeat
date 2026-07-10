import path from 'node:path';
import Link from 'next/link';
import { headers } from 'next/headers';
import React from 'react';
import { Settings } from 'lucide-react';
import { HzSourceDocShell } from '@hertzbeat/ui/source-doc-shell';
import { getAlertIntegrationFallbackDocCopy, loadIntegrationDoc } from '@/lib/alert-integration/controller';
import {
  buildAlertIntegrationSourceHref,
  createAlertIntegrationTranslator,
  DATA_SOURCES,
  getIntegrationSource,
  getIntegrationSourceName
} from '@/lib/alert-integration/view-model';
import { normalizeLocale } from '@/lib/i18n';
import { AlertIntegrationMarkdown } from '../../../../components/pages/alert-integration-markdown';
import { AlertIntegrationSourceRedirect } from './alert-integration-source-redirect';

export default async function AlertIntegrationPage({ params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  const selectedSource = getIntegrationSource(source.trim());
  if (selectedSource.id !== source) {
    return <AlertIntegrationSourceRedirect href={buildAlertIntegrationSourceHref(selectedSource)} />;
  }
  const requestHeaders = await headers();
  const locale = normalizeLocale(requestHeaders.get('accept-language'));
  const t = createAlertIntegrationTranslator(locale);
  const selectedSourceName = getIntegrationSourceName(selectedSource, t);
  const sourceRailLabel = t('alert.integration.sources');
  const baseDir = path.join(process.cwd(), 'public', 'assets', 'doc', 'alert-integration');
  const doc = await loadIntegrationDoc(baseDir, selectedSource.id, locale);
  const fallbackDocCopy = getAlertIntegrationFallbackDocCopy(locale);
  const sourceItems = DATA_SOURCES.map(item => {
    const sourceName = getIntegrationSourceName(item, t);
    return {
      id: item.id,
      href: buildAlertIntegrationSourceHref(item),
      label: sourceName,
      iconSrc: item.icon,
      iconAlt: sourceName,
      selected: item.id === selectedSource.id,
      itemProps: {
        'data-alert-integration-source-item': item.id,
        'data-alert-integration-source-selected': item.id === selectedSource.id ? 'true' : undefined,
        'aria-current': item.id === selectedSource.id ? ('page' as const) : undefined
      },
      iconProps: {
        'data-alert-integration-source-icon': item.id
      }
    };
  });

  return (
    <HzSourceDocShell
      data-alert-integration-surface="hertzbeat-ui-source-doc"
      data-alert-integration-shell-owner="hertzbeat-ui-source-doc-shell"
      eyebrow={t('alert.integration.kicker')}
      title={selectedSourceName}
      docTitle={selectedSourceName}
      sourceRailLabel={sourceRailLabel}
      sourceItems={sourceItems}
      sourceLinkComponent={Link}
      actions={
        <Link
          href="/setting/settings/token"
          className="inline-flex h-7 items-center justify-center rounded-[3px] border border-[#303743] bg-[#151922] px-3 text-[12px] font-semibold leading-none text-[#dfe6f3] transition-colors hover:border-[#415072] hover:bg-[#1a2130]"
          data-alert-integration-token-action-owner="hertzbeat-ui-button-link"
        >
          <Settings className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {t('alert.integration.token.manage')}
        </Link>
      }
    >
      {doc === fallbackDocCopy ? (
        <p data-alert-integration-markdown="rendered" className="text-[13px] leading-7 text-[#a9b0bb]">
          {doc}
        </p>
      ) : (
        <AlertIntegrationMarkdown content={doc} />
      )}
    </HzSourceDocShell>
  );
}
