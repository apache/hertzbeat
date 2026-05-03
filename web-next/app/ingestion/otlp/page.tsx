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
import { loadOtlpPageData } from '@/lib/otlp-center/controller';
import { buildCollectionLoopLinks, buildReadinessRows, buildSelfCheckRows } from '@/lib/otlp-center/view-model';
import type { OtlpEntityBindingSummary, OtlpIngestionGuide, OtlpIngestionOverview } from '@/lib/types';
import { SearchRow } from '../../../components/ui/search-row';
import { coldOpsCatalogVisual } from '../../../lib/cold-ops-visual';
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

const coldOpsVisual = coldOpsCatalogVisual;
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
  const load = useCallback(async (): Promise<OtlpPageData> => {
    return loadOtlpPageData(apiMessageGet);
  }, []);

  return (
    <ClientWorkbench load={load} loadingCopy={t('otlp.loading')}>
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
            label: '快速开始',
            items: [
              {
                key: 'demo-data',
                label: '5 分钟内接入演示数据',
                description: '写入一条演示 OTLP 数据流，并立即查看工作台。',
                href: withSearch('/overview'),
                icon: Zap
              }
            ]
          },
          {
            key: 'migrate',
            label: '现有接入',
            items: [
              {
                key: 'open-telemetry',
                label: '已有 OpenTelemetry',
                description: '复用现有 OpenTelemetry Collector 或 SDK 管道。',
                href: withSearch('/entities/discovery'),
                icon: Network
              },
              {
                key: 'grafana',
                label: 'Grafana',
                description: '将 Grafana 侧的信号接入 HertzBeat。',
                href: withSearch('/ingestion/otlp/metrics'),
                icon: Activity
              },
              {
                key: 'elk',
                label: 'ELK',
                description: '把日志源路由到日志工作台。',
                href: withSearch('/log/manage'),
                icon: Layers3
              },
              {
                key: 'new-relic',
                label: 'New Relic',
                description: '把服务遥测映射到对象目录。',
                href: withSearch('/entities'),
                icon: Boxes
              },
              {
                key: 'commercial-observability',
                label: '已有可观测平台',
                description: '接入服务、日志和指标后，在对象目录和排障工作台继续处理。',
                href: withSearch('/entities/discovery'),
                icon: Activity
              },
              {
                key: 'honeycomb',
                label: 'Honeycomb',
                description: '把链路数据接入链路工作台，并关联服务与日志。',
                href: withSearch('/explorer'),
                icon: Network
              },
              {
                key: 'self-hosted-observability',
                label: '自托管 OTLP 管道',
                description: '复用内网或离线环境中的 OTLP Collector 管道。',
                href: withSearch('/ingestion/otlp'),
                icon: Server
              }
            ]
          },
          {
            key: 'apm-traces',
            label: 'APM / 链路',
            items: [
              { key: 'java', label: 'Java', description: 'Java OpenTelemetry SDK 配置。', href: withSearch('/trace/manage'), icon: Code2 },
              { key: 'python', label: 'Python', description: 'Python OpenTelemetry SDK 配置。', href: withSearch('/trace/manage'), icon: Braces },
              { key: 'nodejs', label: 'JavaScript', description: 'Node.js 与浏览器链路配置。', href: withSearch('/trace/manage'), icon: Globe2 },
              { key: 'golang', label: 'Golang', description: 'Go 服务链路配置。', href: withSearch('/trace/manage'), icon: Network },
              { key: 'dotnet', label: '.NET', description: '.NET OpenTelemetry 埋点配置。', href: withSearch('/trace/manage'), icon: Code2 },
              { key: 'deno', label: 'Deno', description: 'Deno 运行时链路配置。', href: withSearch('/trace/manage'), icon: Braces },
              { key: 'php', label: 'PHP', description: 'PHP 应用链路配置。', href: withSearch('/trace/manage'), icon: Code2 },
              { key: 'ruby', label: 'Ruby', description: 'Ruby 服务链路配置。', href: withSearch('/trace/manage'), icon: Braces },
              { key: 'rust', label: 'Rust', description: 'Rust OpenTelemetry 配置。', href: withSearch('/trace/manage'), icon: Code2 },
              { key: 'nginx-tracing', label: 'Nginx 链路', description: '追踪反向代理和边缘服务调用。', href: withSearch('/trace/manage'), icon: Server },
              { key: 'external-api', label: '外部 API 监控', description: '跟踪外部 API 延迟和错误。', href: withSearch('/trace/manage'), icon: Server },
              { key: 'web-vitals', label: 'Web Vitals 链路', description: '前端链路和核心体验指标配置。', href: withSearch('/trace/manage'), icon: Activity },
              { key: 'temporal', label: 'Temporal', description: '追踪 Temporal 工作流和活动。', href: withSearch('/trace/manage'), icon: Layers3 }
            ]
          },
          {
            key: 'logs',
            label: '日志',
            items: [
              {
                key: 'kubernetes-pod-logs',
                label: 'Kubernetes Pod 日志',
                description: '通过 OTLP 采集 Kubernetes Pod 日志。',
                href: withSearch('/log/manage'),
                icon: Container
              },
              {
                key: 'docker-container-logs',
                label: 'Docker 容器日志',
                description: '把容器日志转发到 HertzBeat。',
                href: withSearch('/log/manage'),
                icon: Boxes
              },
              { key: 'fluentbit', label: 'FluentBit', description: '使用 Fluent Bit 发送日志。', href: withSearch('/log/manage'), icon: FileText },
              { key: 'fluentd', label: 'FluentD', description: '使用 FluentD 发送日志。', href: withSearch('/log/manage'), icon: FileText },
              { key: 'syslog', label: 'Syslog', description: '规范化 Syslog 数据流。', href: withSearch('/log/manage'), icon: FileText },
              { key: 'systemd-logs', label: 'Systemd 日志', description: '采集 systemd journal 日志。', href: withSearch('/log/manage'), icon: Server },
              { key: 'cloudflare-logs', label: 'Cloudflare 日志', description: '转发 Cloudflare 边缘日志。', href: withSearch('/log/manage'), icon: Globe2 },
              { key: 'vercel-logs', label: 'Vercel 日志', description: '转发 Vercel 部署日志。', href: withSearch('/log/manage'), icon: Globe2 },
              { key: 'heroku-logs', label: 'Heroku 日志', description: '转发 Heroku 应用日志。', href: withSearch('/log/manage'), icon: Server },
              { key: 'http-logs', label: 'HTTP 日志上报', description: '通过 HTTP 推送应用日志。', href: withSearch('/log/manage'), icon: Network },
              { key: 'deno-logs', label: 'Deno 日志', description: '采集 Deno 运行时日志。', href: withSearch('/log/manage'), icon: Braces }
            ]
          },
          {
            key: 'metrics',
            label: '指标',
            items: [
              { key: 'prometheus', label: 'Prometheus', description: '把 Prometheus 指标桥接到 OTLP。', href: withSearch('/ingestion/otlp/metrics'), icon: Activity },
              { key: 'otel-metrics', label: 'OpenTelemetry 指标', description: '检查 OTLP 指标数据流。', href: withSearch('/ingestion/otlp/metrics'), icon: Database },
              { key: 'host-metrics', label: '主机指标', description: '采集主机和进程指标。', href: withSearch('/ingestion/otlp/metrics'), icon: Server },
              { key: 'jmx-metrics', label: 'JMX 指标', description: '采集 JVM 和 JMX 指标。', href: withSearch('/ingestion/otlp/metrics'), icon: Database },
              { key: 'nginx-metrics', label: 'Nginx 指标', description: '采集 Nginx 服务指标。', href: withSearch('/ingestion/otlp/metrics'), icon: Server }
            ]
          }
        ];
        const filteredSourceSections = filterOtlpSourceSections(sourceSections, sourceSearch);
        const filterSourceItems = filteredSourceSections.map(section => [section.label, section.items.length] as const);
        const filterTotal = filterSourceItems.reduce((total, [, count]) => total + count, 0);
        const filterItems = [['全部', filterTotal] as const, ...filterSourceItems];
        const signalRibbons = [
          { label: 'OTLP 接入', value: `${activeSignals}/3`, detail: '活跃信号' },
          { label: '指标工作台', value: metricCount, detail: '指标通道' },
          { label: '日志工作台', value: logCount, detail: '日志通道' },
          { label: '链路工作台', value: traceCount, detail: '链路通道' }
        ];
        const readinessRows = buildReadinessRows(data.overview, data.bindings, formatTime);
        const selfCheckRows = buildSelfCheckRows(data.overview.readinessChecks);
        const collectionLoopLinks = buildCollectionLoopLinks();
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
                  <span className={coldOpsVisual.stepper.activeLabel}>选择 OTLP 数据源</span>
                  <span className={coldOpsVisual.stepper.connector} />
                </div>
                <div className={coldOpsVisual.stepper.item}>
                  <span className={coldOpsVisual.stepper.idleBadge}>2</span>
                  <span>配置协议与令牌</span>
                  <span className={coldOpsVisual.stepper.connector} />
                </div>
                <div className={coldOpsVisual.stepper.item}>
                  <span className={coldOpsVisual.stepper.idleBadge}>3</span>
                  <span>进入信号工作台</span>
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
                    <h1 className="text-[34px] font-semibold leading-tight text-white">OTLP 协议接入</h1>
                    <p className="mt-3 max-w-[700px] text-[14px] leading-6 text-[#aeb6c2]">
                      选择 OpenTelemetry/OTLP 数据源，配置指标、日志或链路的接入路径，并绑定到 HertzBeat 对象。
                    </p>
                    <div
                      className={coldOpsVisual.button.row}
                      data-otlp-center-action-bar="standard-action-row"
                      data-otlp-center-action-size={coldOpsVisual.button.sizeContract}
                    >
                      {showEntityReturn ? (
                        <Link href={entityReturnHref}>
                          <Button className={coldOpsVisual.button.compact} size="sm" variant="subtle">
                            返回对象
                          </Button>
                        </Link>
                      ) : null}
                      <Link href="/setting/settings/token">
                        <Button className={coldOpsVisual.button.compact} size="sm" variant="subtle">管理令牌</Button>
                      </Link>
                      <Link href="/entities">
                        <Button className={coldOpsVisual.button.compact} size="sm" variant="subtle">查看实体</Button>
                      </Link>
                      <Link href="/entities/discovery">
                        <Button className={coldOpsVisual.button.primaryCompact} size="sm" variant="subtle">进入遥测发现</Button>
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
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[#7f8794]">采集体系</p>
                    <h2 className="mt-1 text-[15px] font-semibold text-[#f3f6fa]">现有接入闭环</h2>
                  </div>
                  <p className="max-w-[600px] text-[12px] leading-5 text-[#8e97a5]">
                    OTLP 接入只是采集体系的一条路径；传统监控、采集器、模板、服务发现和对象目录继续作为统一运维入口。
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
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[#7f8794]">接入自检</p>
                    <h2 className="mt-1 text-[15px] font-semibold text-[#f3f6fa]">真实状态</h2>
                  </div>
                  <p className="max-w-[540px] text-[12px] leading-5 text-[#8e97a5]">
                    展示已确认的三信号、实体归因和最近上报；未接入的健康项不显示为空指标。
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

              {selfCheckRows.length > 0 ? (
                <section
                  className="mb-5 rounded-[4px] border border-[#252b34] bg-[#0f1217] p-4"
                  data-otlp-self-check-status="backend-backed"
                  data-otlp-self-check-scope="collector-storage-query-greptime"
                >
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#7f8794]">运行自检</p>
                      <h2 className="mt-1 text-[15px] font-semibold text-[#f3f6fa]">Collector、存储和查询</h2>
	                    </div>
	                    <p className="max-w-[560px] text-[12px] leading-5 text-[#8e97a5]">
	                      检查采集节点、历史存储、查询服务和 GreptimeDB 连接状态。
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
                    placeholder="搜索数据源、云服务、SDK 或运行时"
                    searchLabel="筛选"
                    clearLabel="清除"
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
                        未找到匹配的数据源
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
                  <h2 className={coldOpsVisual.filter.title}>筛选</h2>
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
