'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useState } from 'react';
import {
  Activity,
  Boxes,
  Braces,
  Code2,
  Container,
  Database,
  FileText,
  Globe2,
  Layers3,
  Network,
  Server,
  Zap,
  type LucideIcon
} from 'lucide-react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { Button } from '@/components/ui/button';
import { apiMessageGet } from '@/lib/api-client';
import { OTLP_BINDINGS_URL, OTLP_GUIDE_URL, OTLP_OVERVIEW_URL, loadOtlpPageData } from '@/lib/otlp-center/controller';
import {
  buildCollectionLoopLinks,
  buildReadinessRows,
  buildSelfCheckRows,
  buildUnboundCandidateRows
} from '@/lib/otlp-center/view-model';
import type { OtlpEntityBindingSummary, OtlpIngestionGuide, OtlpIngestionOverview } from '@/lib/types';
import { SearchRow } from '../../../components/ui/search-row';
import { hzOpsCatalogVisual } from '../../../lib/hz-ops-visual';
import { formatTime } from '../../../lib/format';
import { readSignalRouteContext } from '../../../lib/signal-route-context';
import { buildEntityWorkspaceHref } from '../../../lib/workspace-navigation';

type OtlpPageData = {
  overview: OtlpIngestionOverview;
  guide: OtlpIngestionGuide;
  bindings: OtlpEntityBindingSummary;
};

type SourceItem = {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  searchAliases?: string[];
};

type SourceSection = {
  key: string;
  label: string;
  items: SourceItem[];
};

const coldOpsVisual = hzOpsCatalogVisual;
const sourceCardClass = coldOpsVisual.sourceCard.className;

const sourceBrandMarks: Record<
  string,
  {
    label: string;
    background: string;
    color: string;
    border?: string;
    art?: 'ops-mesh' | 'grafana' | 'elk' | 'new-relic' | 'honeycomb' | 'self-hosted-pipeline' | 'java' | 'kubernetes' | 'docker';
  }
> = {
  'open-telemetry': { label: 'OT', background: '#050816', color: '#f6c244', border: '#2d3445' },
  grafana: { label: 'G', background: '#1f1309', color: '#ff8b2b', border: '#3f2611', art: 'grafana' },
  elk: { label: 'EL', background: '#111318', color: '#2ec7c9', border: '#2b303a', art: 'elk' },
  'new-relic': { label: 'NR', background: '#06241f', color: '#00e0a4', border: '#0f4c3f', art: 'new-relic' },
  'commercial-observability': { label: 'OM', background: '#15171d', color: '#f8fafc', border: '#2d313c', art: 'ops-mesh' },
  honeycomb: { label: 'HC', background: '#231807', color: '#ffbf3c', border: '#5c4110', art: 'honeycomb' },
  'self-hosted-observability': { label: 'SH', background: '#2a130f', color: '#ff6b4a', border: '#5f271b', art: 'self-hosted-pipeline' },
  java: { label: 'J', background: '#fff7ed', color: '#dc2626', border: '#fed7aa', art: 'java' },
  python: { label: 'Py', background: '#0f2137', color: '#ffd95a', border: '#264b74' },
  nodejs: { label: 'JS', background: '#2d2a08', color: '#f7df1e', border: '#5b5310' },
  golang: { label: 'Go', background: '#062735', color: '#67e8f9', border: '#155e75' },
  dotnet: { label: '.N', background: '#241149', color: '#c4b5fd', border: '#4c1d95' },
  deno: { label: 'De', background: '#111827', color: '#f9fafb', border: '#374151' },
  php: { label: 'php', background: '#1e1f3d', color: '#a5b4fc', border: '#3730a3' },
  ruby: { label: 'Rb', background: '#351113', color: '#fb7185', border: '#7f1d1d' },
  rust: { label: 'Rs', background: '#2b1d12', color: '#fdba74', border: '#7c2d12' },
  'kubernetes-pod-logs': { label: 'K8s', background: '#0b3b8d', color: '#dbeafe', border: '#2563eb', art: 'kubernetes' },
  'docker-container-logs': { label: 'Dc', background: '#062840', color: '#38bdf8', border: '#075985', art: 'docker' },
  'cloudflare-logs': { label: 'CF', background: '#331707', color: '#fb923c', border: '#7c2d12' },
  'vercel-logs': { label: '▲', background: '#f8fafc', color: '#111827', border: '#e5e7eb' },
  prometheus: { label: 'Pr', background: '#33170b', color: '#ff7a45', border: '#7c2d12' }
};

function SourceBrandArt({ art }: { art: NonNullable<(typeof sourceBrandMarks)[string]['art']> }) {
  if (art === 'ops-mesh') {
    return (
      <span className="relative block size-4" aria-hidden="true">
        <span className="absolute left-[2px] top-[2px] size-[5px] rounded-[1px] border border-white/80" />
        <span className="absolute right-[2px] top-[2px] size-[5px] rounded-[1px] border border-white/80" />
        <span className="absolute bottom-[2px] left-[5px] size-[5px] rounded-[1px] border border-white/80" />
        <span className="absolute left-[6px] top-[7px] h-px w-[5px] bg-white/80" />
        <span className="absolute left-[4px] top-[7px] h-[5px] w-px rotate-45 bg-white/80" />
      </span>
    );
  }

  if (art === 'grafana') {
    return (
      <span className="relative block size-4" aria-hidden="true">
        <span className="absolute inset-[2px] rounded-full border-2 border-[#ff7a1a]" />
        <span className="absolute left-[5px] top-[5px] size-[5px] rounded-full bg-[#ff7a1a]" />
        <span className="absolute right-[1px] top-[2px] size-[3px] rounded-full bg-[#ffb36b]" />
      </span>
    );
  }

  if (art === 'elk') {
    return (
      <span className="grid size-4 grid-cols-2 gap-[2px]" aria-hidden="true">
        <span className="rounded-full bg-[#00bfb3]" />
        <span className="rounded-full bg-[#f04e98]" />
        <span className="rounded-full bg-[#f9c74f]" />
        <span className="rounded-full bg-[#5b8def]" />
      </span>
    );
  }

  if (art === 'new-relic') {
    return (
      <span className="relative block size-4" aria-hidden="true">
        <span className="absolute inset-[1px] bg-[#00d68f]" style={{ clipPath: 'polygon(50% 0, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }} />
        <span className="absolute inset-[5px] rounded-[2px] bg-[#06241f]" />
      </span>
    );
  }

  if (art === 'honeycomb') {
    return (
      <span className="relative block size-4" aria-hidden="true">
        <span className="absolute left-[1px] top-[3px] size-[5px] rotate-45 rounded-[1px] bg-[#f59e0b]" />
        <span className="absolute left-[6px] top-[1px] size-[5px] rotate-45 rounded-[1px] bg-[#fbbf24]" />
        <span className="absolute left-[8px] top-[8px] size-[5px] rotate-45 rounded-[1px] bg-[#d97706]" />
      </span>
    );
  }

  if (art === 'self-hosted-pipeline') {
    return (
      <span className="relative block size-4" aria-hidden="true">
        <span className="absolute left-[1px] top-[3px] h-[10px] w-[4px] rounded-[1px] border border-white/80" />
        <span className="absolute left-[6px] top-[1px] h-[14px] w-[4px] rounded-[1px] border border-white/70" />
        <span className="absolute right-[1px] top-[4px] h-[8px] w-[4px] rounded-[1px] border border-white/60" />
        <span className="absolute left-[4px] top-[7px] h-px w-[8px] bg-white/70" />
      </span>
    );
  }

  if (art === 'java') {
    return (
      <span className="relative flex size-4 items-end justify-center text-[7px] font-black leading-none text-[#d71920]" aria-hidden="true">
        <span className="absolute left-[5px] top-[1px] h-[5px] w-[5px] rounded-full border-t border-[#2b6cb0]" />
        <span>Java</span>
      </span>
    );
  }

  if (art === 'kubernetes') {
    return (
      <span className="relative flex size-4 items-center justify-center" aria-hidden="true">
        <span className="absolute inset-[1px] bg-[#326ce5]" style={{ clipPath: 'polygon(50% 0, 86% 14%, 100% 50%, 86% 86%, 50% 100%, 14% 86%, 0 50%, 14% 14%)' }} />
        <span className="relative text-[9px] font-black leading-none text-white">✳</span>
      </span>
    );
  }

  return (
    <span className="relative block size-4" aria-hidden="true">
      <span className="absolute bottom-[4px] left-[2px] h-[4px] w-[11px] rounded-[1px] bg-[#1d9bf0]" />
      <span className="absolute bottom-[8px] left-[3px] h-[3px] w-[3px] rounded-[1px] bg-[#38bdf8]" />
      <span className="absolute bottom-[8px] left-[7px] h-[3px] w-[3px] rounded-[1px] bg-[#38bdf8]" />
      <span className="absolute bottom-[11px] left-[5px] h-[2px] w-[5px] rounded-[1px] bg-[#7dd3fc]" />
    </span>
  );
}

function SourceBrandMark({ itemKey, brandMark }: { itemKey: string; brandMark: (typeof sourceBrandMarks)[string] }) {
  return (
    <span
      className={coldOpsVisual.sourceCard.mark}
      data-otlp-center-brand-logo={itemKey}
      data-otlp-center-brand-art={brandMark.art ? itemKey : undefined}
      style={{
        background: brandMark.background,
        borderColor: brandMark.border ?? 'transparent',
        color: brandMark.color
      }}
    >
      {brandMark.art ? <SourceBrandArt art={brandMark.art} /> : brandMark.label}
    </span>
  );
}

function SourceCard({ item }: { item: SourceItem }) {
  const Icon = item.icon;
  const brandMark = sourceBrandMarks[item.key];

  return (
    <Link
      className={sourceCardClass}
      data-otlp-center-source-card={item.key}
      data-otlp-center-source-card-density="nav-scale-compact"
      href={item.href}
      title={item.description}
    >
      {brandMark ? (
        <SourceBrandMark itemKey={item.key} brandMark={brandMark} />
      ) : (
        <span className={coldOpsVisual.sourceCard.icon}>
          <Icon className="size-3" aria-hidden="true" />
        </span>
      )}
      <span className={coldOpsVisual.sourceCard.label}>{item.label}</span>
    </Link>
  );
}

function readinessToneClass(tone: 'success' | 'warning' | 'danger' | 'neutral') {
  if (tone === 'success') return 'bg-[#2dd46f]';
  if (tone === 'warning') return 'bg-[#f5b84b]';
  if (tone === 'danger') return 'bg-[#f06464]';
  return 'bg-[#8b93a2]';
}

function tokenizeSourceSearchText(value: string) {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function sourceItemMatchesSearch(item: SourceItem, sourceSearch: string) {
  const searchTokens = tokenizeSourceSearchText(sourceSearch);
  if (searchTokens.length === 0) return true;

  const sourceTokens = [item.label, item.key, ...(item.searchAliases ?? [])]
    .flatMap(tokenizeSourceSearchText);

  return searchTokens.every(searchToken =>
    sourceTokens.some(sourceToken => sourceToken.startsWith(searchToken))
  );
}

export function filterOtlpSourceSections(sourceSections: SourceSection[], sourceSearch: string) {
  if (tokenizeSourceSearchText(sourceSearch).length === 0) return sourceSections;

  return sourceSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => sourceItemMatchesSearch(item, sourceSearch))
    }))
    .filter(section => section.items.length > 0);
}

export default function OtlpPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [sourceSearch, setSourceSearch] = useState('');
  const otlpCenterCacheKey = React.useMemo(
    () => ['otlp-center', OTLP_OVERVIEW_URL, OTLP_GUIDE_URL, OTLP_BINDINGS_URL].join(':'),
    []
  );
  const load = useCallback(async (): Promise<OtlpPageData> => {
    return loadOtlpPageData(apiMessageGet);
  }, []);

  return (
    <ClientWorkbench load={load} loadingCopy={t('otlp.loading')} cacheKey={otlpCenterCacheKey}>
      {data => {
        const routeContext = readSignalRouteContext(searchParams);
        const rawSearch = searchParams.toString();
        const withSearch = (path: string) => (rawSearch ? `${path}?${rawSearch}` : path);
        const entityReturnHref = buildEntityWorkspaceHref(routeContext);
        const showEntityReturn = Boolean(routeContext.returnTo || routeContext.entityId);
        const activeSignals = data.overview.activeSignalCount ?? 0;
        const logCount = data.overview.logs?.totalCount ?? 0;
        const metricCount = data.overview.metrics?.totalCount ?? 0;
        const traceCount = data.overview.traces?.totalCount ?? 0;
        const sourceSections: SourceSection[] = [
          {
            key: 'quickstart',
            label: t('otlp.source.section.quickstart'),
            items: [
              {
                key: 'demo-data',
                label: t('otlp.source.item.demo-data.label'),
                description: t('otlp.source.item.demo-data.description'),
                href: withSearch('/overview'),
                icon: Zap
              }
            ]
          },
          {
            key: 'migrate',
            label: t('otlp.source.section.migrate'),
            items: [
              {
                key: 'open-telemetry',
                label: t('otlp.source.item.open-telemetry.label'),
                description: t('otlp.source.item.open-telemetry.description'),
                href: withSearch('/entities/discovery'),
                icon: Network
              },
              {
                key: 'grafana',
                label: 'Grafana',
                description: t('otlp.source.item.grafana.description'),
                href: withSearch('/ingestion/otlp/metrics'),
                icon: Activity
              },
              {
                key: 'elk',
                label: 'ELK',
                description: t('otlp.source.item.elk.description'),
                href: withSearch('/log/manage'),
                icon: Layers3
              },
              {
                key: 'new-relic',
                label: 'New Relic',
                description: t('otlp.source.item.new-relic.description'),
                href: withSearch('/entities'),
                icon: Boxes
              },
              {
                key: 'commercial-observability',
                label: t('otlp.source.item.commercial-observability.label'),
                description: t('otlp.source.item.commercial-observability.description'),
                href: withSearch('/entities/discovery'),
                icon: Activity
              },
              {
                key: 'honeycomb',
                label: 'Honeycomb',
                description: t('otlp.source.item.honeycomb.description'),
                href: withSearch('/explorer'),
                icon: Network
              },
              {
                key: 'self-hosted-observability',
                label: t('otlp.source.item.self-hosted-observability.label'),
                description: t('otlp.source.item.self-hosted-observability.description'),
                href: withSearch('/ingestion/otlp'),
                icon: Server
              }
            ]
          },
          {
            key: 'apm-traces',
            label: t('otlp.source.section.apm-traces'),
            items: [
              { key: 'java', label: 'Java', description: t('otlp.source.item.java.description'), href: withSearch('/trace/manage'), icon: Code2 },
              { key: 'python', label: 'Python', description: t('otlp.source.item.python.description'), href: withSearch('/trace/manage'), icon: Braces },
              { key: 'nodejs', label: 'JavaScript', description: t('otlp.source.item.nodejs.description'), href: withSearch('/trace/manage'), icon: Globe2 },
              { key: 'golang', label: 'Golang', description: t('otlp.source.item.golang.description'), href: withSearch('/trace/manage'), icon: Network },
              { key: 'dotnet', label: '.NET', description: t('otlp.source.item.dotnet.description'), href: withSearch('/trace/manage'), icon: Code2 },
              { key: 'deno', label: 'Deno', description: t('otlp.source.item.deno.description'), href: withSearch('/trace/manage'), icon: Braces },
              { key: 'php', label: 'PHP', description: t('otlp.source.item.php.description'), href: withSearch('/trace/manage'), icon: Code2 },
              { key: 'ruby', label: 'Ruby', description: t('otlp.source.item.ruby.description'), href: withSearch('/trace/manage'), icon: Braces },
              { key: 'rust', label: 'Rust', description: t('otlp.source.item.rust.description'), href: withSearch('/trace/manage'), icon: Code2 },
              { key: 'nginx-tracing', label: t('otlp.source.item.nginx-tracing.label'), description: t('otlp.source.item.nginx-tracing.description'), href: withSearch('/trace/manage'), icon: Server },
              { key: 'external-api', label: t('otlp.source.item.external-api.label'), description: t('otlp.source.item.external-api.description'), href: withSearch('/trace/manage'), icon: Server },
              { key: 'web-vitals', label: t('otlp.source.item.web-vitals.label'), description: t('otlp.source.item.web-vitals.description'), href: withSearch('/trace/manage'), icon: Activity },
              { key: 'temporal', label: 'Temporal', description: t('otlp.source.item.temporal.description'), href: withSearch('/trace/manage'), icon: Layers3 }
            ]
          },
          {
            key: 'logs',
            label: t('otlp.source.section.logs'),
            items: [
              {
                key: 'kubernetes-pod-logs',
                label: t('otlp.source.item.kubernetes-pod-logs.label'),
                description: t('otlp.source.item.kubernetes-pod-logs.description'),
                href: withSearch('/log/manage'),
                icon: Container
              },
              {
                key: 'docker-container-logs',
                label: t('otlp.source.item.docker-container-logs.label'),
                description: t('otlp.source.item.docker-container-logs.description'),
                href: withSearch('/log/manage'),
                icon: Boxes
              },
              { key: 'fluentbit', label: 'FluentBit', description: t('otlp.source.item.fluentbit.description'), href: withSearch('/log/manage'), icon: FileText },
              { key: 'fluentd', label: 'FluentD', description: t('otlp.source.item.fluentd.description'), href: withSearch('/log/manage'), icon: FileText },
              { key: 'syslog', label: 'Syslog', description: t('otlp.source.item.syslog.description'), href: withSearch('/log/manage'), icon: FileText },
              { key: 'systemd-logs', label: t('otlp.source.item.systemd-logs.label'), description: t('otlp.source.item.systemd-logs.description'), href: withSearch('/log/manage'), icon: Server },
              { key: 'cloudflare-logs', label: t('otlp.source.item.cloudflare-logs.label'), description: t('otlp.source.item.cloudflare-logs.description'), href: withSearch('/log/manage'), icon: Globe2 },
              { key: 'vercel-logs', label: t('otlp.source.item.vercel-logs.label'), description: t('otlp.source.item.vercel-logs.description'), href: withSearch('/log/manage'), icon: Globe2 },
              { key: 'heroku-logs', label: t('otlp.source.item.heroku-logs.label'), description: t('otlp.source.item.heroku-logs.description'), href: withSearch('/log/manage'), icon: Server },
              { key: 'http-logs', label: t('otlp.source.item.http-logs.label'), description: t('otlp.source.item.http-logs.description'), href: withSearch('/log/manage'), icon: Network },
              { key: 'deno-logs', label: t('otlp.source.item.deno-logs.label'), description: t('otlp.source.item.deno-logs.description'), href: withSearch('/log/manage'), icon: Braces }
            ]
          },
          {
            key: 'metrics',
            label: t('otlp.source.section.metrics'),
            items: [
              { key: 'prometheus', label: 'Prometheus', description: t('otlp.source.item.prometheus.description'), href: withSearch('/ingestion/otlp/metrics'), icon: Activity },
              { key: 'otel-metrics', label: t('otlp.source.item.otel-metrics.label'), description: t('otlp.source.item.otel-metrics.description'), href: withSearch('/ingestion/otlp/metrics'), icon: Database },
              { key: 'host-metrics', label: t('otlp.source.item.host-metrics.label'), description: t('otlp.source.item.host-metrics.description'), href: withSearch('/ingestion/otlp/metrics'), icon: Server },
              { key: 'jmx-metrics', label: t('otlp.source.item.jmx-metrics.label'), description: t('otlp.source.item.jmx-metrics.description'), href: withSearch('/ingestion/otlp/metrics'), icon: Database },
              { key: 'nginx-metrics', label: t('otlp.source.item.nginx-metrics.label'), description: t('otlp.source.item.nginx-metrics.description'), href: withSearch('/ingestion/otlp/metrics'), icon: Server }
            ]
          }
        ];
        const filteredSourceSections = filterOtlpSourceSections(sourceSections, sourceSearch);
        const filterSourceItems = filteredSourceSections.map(section => [section.label, section.items.length] as const);
        const filterTotal = filterSourceItems.reduce((total, [, count]) => total + count, 0);
        const filterItems = [[t('otlp.source.filter.all'), filterTotal] as const, ...filterSourceItems];
        const signalRibbons = [
          { label: t('otlp.ribbon.intake.label'), value: `${activeSignals}/3`, detail: t('otlp.ribbon.intake.detail') },
          { label: t('otlp.ribbon.metrics.label'), value: metricCount, detail: t('otlp.ribbon.metrics.detail') },
          { label: t('otlp.ribbon.logs.label'), value: logCount, detail: t('otlp.ribbon.logs.detail') },
          { label: t('otlp.ribbon.traces.label'), value: traceCount, detail: t('otlp.ribbon.traces.detail') }
        ];
        const readinessRows = buildReadinessRows(data.overview, data.bindings, formatTime, t);
        const selfCheckRows = buildSelfCheckRows(data.overview.readinessChecks);
        const unboundCandidateRows = buildUnboundCandidateRows(data.bindings.recentUnboundCandidates);
        const collectionLoopLinks = buildCollectionLoopLinks(t);
        return (
          <main
            className={coldOpsVisual.canvas.root}
            data-workspace-shell="true"
            data-otlp-center-route="hertzbeat-intake-cortex"
            data-otlp-center-visual-system={coldOpsVisual.visualSystem}
            data-otlp-visual-contract={coldOpsVisual.contract}
            data-otlp-visual-radius={coldOpsVisual.radius.contract}
            data-otlp-visual-rail={coldOpsVisual.layout.railWidth}
            data-otlp-center-tone={coldOpsVisual.tone}
            data-otlp-center-catalog-canvas={coldOpsVisual.canvasName}
            style={coldOpsVisual.canvas.backgroundStyle}
          >
            <section
              className={coldOpsVisual.stepper.shell}
              data-otlp-center-stepper="hertzbeat-intake-steps"
              data-otlp-center-stepper-align="centered-860-balanced"
              data-otlp-center-stepper-phase="source-selection"
            >
              <div className={coldOpsVisual.stepper.divider} aria-hidden="true" />
              <div className={coldOpsVisual.stepper.grid}>
                <div className={coldOpsVisual.stepper.itemCompact}>
                  <span className={coldOpsVisual.stepper.activeBadge}>1</span>
                  <span className={coldOpsVisual.stepper.activeLabel}>{t('otlp.stepper.source')}</span>
                  <span className={coldOpsVisual.stepper.connector} />
                </div>
                <div className={coldOpsVisual.stepper.item}>
                  <span className={coldOpsVisual.stepper.idleBadge}>2</span>
                  <span>{t('otlp.stepper.protocol')}</span>
                  <span className={coldOpsVisual.stepper.connector} />
                </div>
                <div className={coldOpsVisual.stepper.item}>
                  <span className={coldOpsVisual.stepper.idleBadge}>3</span>
                  <span>{t('otlp.stepper.workbench')}</span>
                </div>
              </div>
            </section>

            <section className={coldOpsVisual.layout.pageSection}>
              <div className={coldOpsVisual.layout.pageDivider} aria-hidden="true" />
              <div className={coldOpsVisual.layout.heroGrid} data-otlp-center-hero="hertzbeat-intake-cortex">
                <div className={coldOpsVisual.panel.hero}>
                  <div
                    className={coldOpsVisual.canvas.panelMesh}
                    aria-hidden="true"
                    style={coldOpsVisual.canvas.panelMeshStyle}
                  />
                  <div className="relative">
                    <h1 className="text-[34px] font-semibold leading-tight text-white">{t('otlp.hero.title')}</h1>
                    <p className="mt-3 max-w-[700px] text-[14px] leading-6 text-[#aeb6c2]">
                      {t('otlp.hero.copy')}
                    </p>
                    <div
                      className={coldOpsVisual.button.row}
                      data-otlp-center-action-bar="standard-action-row"
                      data-otlp-center-action-size={coldOpsVisual.button.sizeContract}
                    >
                      {showEntityReturn ? (
                        <Link href={entityReturnHref}>
                          <Button className={coldOpsVisual.button.compact} size="sm" variant="subtle">
                            {t('otlp.action.return-entity')}
                          </Button>
                        </Link>
                      ) : null}
                      <Link href="/setting/settings/token">
                        <Button className={coldOpsVisual.button.compact} size="sm" variant="subtle">{t('otlp.manage-token')}</Button>
                      </Link>
                      <Link href="/entities">
                        <Button className={coldOpsVisual.button.compact} size="sm" variant="subtle">{t('otlp.action.view-entities')}</Button>
                      </Link>
                      <Link href="/entities/discovery">
                        <Button className={coldOpsVisual.button.primaryCompact} size="sm" variant="subtle">{t('otlp.open-discovery')}</Button>
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={coldOpsVisual.signal.band}
                    data-otlp-center-signal-band="hertzbeat-signal-ribbons"
                    data-otlp-center-signal-band-layout="single-layer"
                    data-otlp-center-signal-value-scale="restrained-17"
                  >
                    {signalRibbons.map((item, index) => (
                      <div key={item.label} className={coldOpsVisual.signal.ribbon}>
                        <div>
                          <p className={coldOpsVisual.signal.label}>{item.label}</p>
                          <p className={coldOpsVisual.signal.detail}>{item.detail}</p>
                        </div>
                        <span className={index === 0 ? coldOpsVisual.signal.activeValue : coldOpsVisual.signal.value}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <section
                className="mb-5 rounded-[4px] border border-[#252b34] bg-[#0f1217] p-4"
                data-otlp-collection-loop="existing-ingestion-system"
              >
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[#7f8794]">{t('otlp.section.collection-loop.kicker')}</p>
                    <h2 className="mt-1 text-[15px] font-semibold text-[#f3f6fa]">{t('otlp.section.collection-loop.title')}</h2>
                  </div>
                  <p className="max-w-[600px] text-[12px] leading-5 text-[#8e97a5]">
                    {t('otlp.section.collection-loop.copy')}
                  </p>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {collectionLoopLinks.map(link => (
                    <Link
                      key={link.key}
                      href={link.href}
                      className="group min-w-0 rounded-[3px] border border-[#2a303a] bg-[#101319] px-3 py-2 transition hover:border-[#4e74f8] hover:bg-[#151b28]"
                      data-otlp-collection-loop-link={link.key}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="truncate text-[13px] font-semibold text-[#f6f8fb]">{link.title}</h3>
                        <span className="shrink-0 rounded-[3px] border border-[#323946] bg-[#121720] px-2 py-0.5 text-[10px] font-semibold text-[#8d97a6]">
                          {link.meta}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#8993a3]">{link.copy}</p>
                    </Link>
                  ))}
                </div>
              </section>

              <section
                className="mb-5 rounded-[4px] border border-[#252b34] bg-[#0f1217] p-4"
                data-otlp-readiness-status="overview-backed"
                data-otlp-readiness-scope="signals-entity-latest"
              >
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[#7f8794]">{t('otlp.section.readiness.kicker')}</p>
                    <h2 className="mt-1 text-[15px] font-semibold text-[#f3f6fa]">{t('otlp.section.readiness.title')}</h2>
                  </div>
                  <p className="max-w-[540px] text-[12px] leading-5 text-[#8e97a5]">
                    {t('otlp.section.readiness.copy')}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {readinessRows.map(row => (
                    <div
                      key={row.key}
                      className="min-w-0 rounded-[3px] border border-[#2a303a] bg-[#101319] px-3 py-2"
                      data-otlp-readiness-row={row.key}
                      data-otlp-readiness-tone={row.tone}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`size-1.5 shrink-0 rounded-full ${readinessToneClass(row.tone)}`} aria-hidden="true" />
                        <p className="truncate text-[11px] font-semibold text-[#a8b0bd]">{row.title}</p>
                      </div>
                      <p className="mt-1 truncate text-[16px] font-semibold tabular-nums text-[#f8fafc]">{row.copy}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#6f7784]">{row.meta}</p>
                    </div>
                  ))}
                </div>
              </section>

              {unboundCandidateRows.length > 0 ? (
                <section
                  className="mb-5 rounded-[4px] border border-[#252b34] bg-[#0f1217] p-4"
                  data-otlp-entity-candidates="telemetry-derived"
                  data-otlp-entity-candidate-count={unboundCandidateRows.length}
                >
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#7f8794]">{t('otlp.section.candidates.kicker')}</p>
                      <h2 className="mt-1 text-[15px] font-semibold text-[#f3f6fa]">{t('otlp.section.candidates.title')}</h2>
                    </div>
                    <p className="max-w-[540px] text-[12px] leading-5 text-[#8e97a5]">
                      {t('otlp.section.candidates.copy')}
                    </p>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    {unboundCandidateRows.map(row => (
                      <Link
                        key={row.key}
                        href={row.href}
                        className="group min-w-0 rounded-[3px] border border-[#2a303a] bg-[#101319] px-3 py-2 transition hover:border-[#4e74f8] hover:bg-[#151b28]"
                        data-otlp-entity-candidate-row={row.key}
                        data-otlp-entity-candidate-signals={row.signals.join(',')}
                        data-otlp-entity-candidate-identities={row.canonicalIdentitySummary}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="truncate text-[13px] font-semibold text-[#f6f8fb]">{row.title}</h3>
                          <span className="shrink-0 rounded-[3px] border border-[#323946] bg-[#121720] px-2 py-0.5 text-[10px] font-semibold text-[#8d97a6]">
                            {t('otlp.section.candidates.pending')}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[12px] leading-5 text-[#9ba5b4]">{row.copy}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[#6f7784]">{row.meta}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {selfCheckRows.length > 0 ? (
                <section
                  className="mb-5 rounded-[4px] border border-[#252b34] bg-[#0f1217] p-4"
                  data-otlp-self-check-status="backend-backed"
                  data-otlp-self-check-scope="collector-storage-query-greptime"
                >
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#7f8794]">{t('otlp.section.self-check.kicker')}</p>
                      <h2 className="mt-1 text-[15px] font-semibold text-[#f3f6fa]">{t('otlp.section.self-check.title')}</h2>
	                    </div>
	                    <p className="max-w-[560px] text-[12px] leading-5 text-[#8e97a5]">
	                      {t('otlp.section.self-check.copy')}
	                    </p>
	                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {selfCheckRows.map(row => (
                      <div
                        key={row.key}
                        className="min-w-0 rounded-[3px] border border-[#2a303a] bg-[#101319] px-3 py-2"
                        data-otlp-self-check-row={row.key}
                        data-otlp-self-check-tone={row.tone}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`size-1.5 shrink-0 rounded-full ${readinessToneClass(row.tone)}`} aria-hidden="true" />
                          <p className="truncate text-[11px] font-semibold text-[#a8b0bd]">{row.title}</p>
                        </div>
                        <p className="mt-1 truncate text-[16px] font-semibold tabular-nums text-[#f8fafc]">{row.copy}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[#6f7784]">{row.meta}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className={coldOpsVisual.layout.railGrid} data-otlp-center-rail-grid="shared-340">
                <section className="min-w-0" data-otlp-center-source-grid="hertzbeat-source-catalog">
                  <SearchRow
                    data-otlp-center-search-row="hertzbeat-catalog-filter"
                    data-otlp-center-search-owner="shared-search-row"
                    data-otlp-center-search-mode={coldOpsVisual.search.mode}
                    data-otlp-center-filtered-total={filterTotal}
                    value={sourceSearch}
                    placeholder={t('otlp.source.search.placeholder')}
                    searchLabel={t('otlp.source.search.label')}
                    clearLabel={t('common.clear')}
                    inputWidthClassName="w-[360px]"
                    onValueChange={setSourceSearch}
                    onSearch={() => setSourceSearch(value => value)}
                    onClear={() => setSourceSearch('')}
                  />

                  <div className={coldOpsVisual.sourceCard.stack}>
                    {filteredSourceSections.map(section => (
                      <section key={section.key} className={coldOpsVisual.sourceCard.section} data-otlp-center-source-section={section.key}>
                        <h2 className={coldOpsVisual.sourceCard.heading}>
                          {section.label} ({section.items.length})
                        </h2>
                        <div
                          className={coldOpsVisual.sourceCard.grid}
                          data-otlp-center-grid-density="hertzbeat-dense-catalog"
                          data-otlp-center-grid-span={coldOpsVisual.sourceCard.gridSpan}
                        >
                          {section.items.map(item => (
                            <SourceCard key={item.key} item={item} />
                          ))}
                        </div>
                      </section>
                    ))}
                    {filteredSourceSections.length === 0 ? (
                      <div
                        className={coldOpsVisual.sourceCard.empty}
                        data-otlp-center-search-empty="true"
                      >
                        {t('otlp.source.search.empty')}
                      </div>
                    ) : null}
                  </div>
                </section>

                <aside
                  className={coldOpsVisual.panel.rail}
                  data-otlp-center-filter-rail="hertzbeat-prism-filters"
                  data-otlp-center-filter-rail-mode={coldOpsVisual.panel.railMode}
                  data-otlp-center-filter-rail-stickiness="static-flow"
                  data-otlp-center-filter-line-alignment="fixed-count-column"
                  data-otlp-center-filter-total={filterTotal}
                >
                  <h2 className={coldOpsVisual.filter.title}>{t('otlp.source.filter.title')}</h2>
                  <div className={coldOpsVisual.filter.list}>
                    {filterItems.map(([label, count], index) => (
                      <div key={label} className={coldOpsVisual.filter.item}>
                        <span className={index === 0 ? coldOpsVisual.filter.activeText : coldOpsVisual.filter.idleText}>{label}</span>
                        <span className={coldOpsVisual.filter.dash} />
                        <span className={coldOpsVisual.filter.count}>
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </section>
          </main>
        );
      }}
    </ClientWorkbench>
  );
}
