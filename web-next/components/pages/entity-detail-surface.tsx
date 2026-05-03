'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, Bell, Edit3, FileText, GitBranch, Network, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import {
  buildCollectionSourceRows,
  buildCurrentAlertRows,
  buildDetailFacts,
  buildDrilldownRows,
  buildEntityAttributionRows,
  buildEntityContextHandoffLinks,
  buildEntityHealthModel,
  buildEntityIncomingContextRows,
  buildNextActionRows,
  buildOverviewRows,
  buildRelationshipRows,
  buildSummaryRows
} from '../../lib/entity-detail/view-model';
import type { SignalRouteContext } from '../../lib/signal-route-context';
import type { EntityDetailDto } from '../../lib/types';

type EntityDetailSurfaceProps = {
  detail: EntityDetailDto;
  routeContext?: SignalRouteContext;
  actionError: string | null;
  isPending: boolean;
  onDelete: (entityId: string | number | null | undefined) => void;
  onRefresh: () => void;
};

type DetailRow = {
  title: string;
  copy: string;
  freshness?: string;
  href?: string;
  meta: string;
};

type ContextLinkRow = DetailRow & {
  key: string;
};

type IncomingContextRow = {
  label: string;
  value: string;
  meta: string;
};

type AttributionRow = DetailRow & {
  key: string;
  state: 'ready' | 'review' | 'missing';
};

const coldEntityDetailVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldDangerButtonClassName =
  'h-8 min-w-[88px] rounded-[3px] border-[#3f2228] bg-[#181013] px-3 text-[12px] font-semibold text-[#f0b8c1] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#8b3341] hover:bg-[#211217] hover:text-[#ffd5dc]';

const coldPrimaryLinkClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldLinkButtonClassName =
  'inline-flex h-8 min-w-[104px] items-center justify-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

function resolveTitle(detail: EntityDetailDto) {
  const entity = detail.entity?.entity || {};
  return entity.displayName || entity.name || '实体详情';
}

function resolveSubtitle(detail: EntityDetailDto) {
  const activeAlerts = detail.alertSummary?.totalActiveAlerts ?? detail.activeAlerts?.length ?? 0;
  const downMonitors = detail.evidenceSummary?.downMonitorCount ?? 0;
  const hasEvidence = (detail.logSummary?.hintCount ?? 0) > 0 || (detail.traceSummary?.recentTraceCount ?? 0) > 0 || (detail.boundMonitors?.length ?? 0) > 0;

  if (activeAlerts > 0) {
    return '当前实体已有活跃告警，优先确认告警和最近变化。';
  }
  if (downMonitors > 0) {
    return '已有绑定监控异常，先从监控证据确认影响面。';
  }
  if (hasEvidence) {
    return '日志、链路或监控证据已关联，可继续排查。';
  }
  return '先补齐负责人、定义和遥测绑定，让实体成为可用工作台。';
}

function countMetrics(detail: EntityDetailDto) {
  return [
    {
      label: '绑定监控',
      value: detail.monitorSummary?.totalBoundMonitors ?? detail.boundMonitors?.length ?? detail.entity?.monitorBinds?.length ?? 0,
      Icon: Network
    },
    {
      label: '活跃告警',
      value: detail.alertSummary?.totalActiveAlerts ?? detail.activeAlerts?.length ?? detail.evidenceSummary?.activeAlertCount ?? 0,
      Icon: Bell
    },
    {
      label: '身份标识',
      value: detail.evidenceSummary?.identityCount ?? detail.entity?.identities?.length ?? 0,
      Icon: FileText
    },
    {
      label: '关联关系',
      value: detail.entity?.relations?.length ?? 0,
      Icon: GitBranch
    }
  ];
}

function rowStatusClass(row: DetailRow) {
  const value = `${row.title} ${row.copy} ${row.meta}`;
  if (value.includes('异常') || value.includes('告警') || value.includes('错误')) {
    return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
  }
  if (value.includes('健康') || value.includes('可用')) {
    return 'border-[#166534]/45 bg-[#0f2f23] text-[#86efac]';
  }
  return 'border-[#303743] bg-[#101217] text-[#cbd5e1]';
}

function attributionStateClass(state: AttributionRow['state']) {
  switch (state) {
    case 'ready':
      return 'border-[#1f5137] bg-[#0f2f23] text-[#86efac]';
    case 'review':
      return 'border-[#574622] bg-[#1b1710] text-[#facc6b]';
    default:
      return 'border-[#5f2630] bg-[#211217] text-[#f0b8c1]';
  }
}

function AttributionRows({ rows }: { rows: AttributionRow[] }) {
  return (
    <div data-entity-detail-attribution-panel="entity-resource-attribution" className="mb-3 grid gap-2 sm:grid-cols-2">
      {rows.map(row => (
        <div
          key={row.key}
          data-entity-detail-attribution-row={row.key}
          data-entity-detail-attribution-state={row.state}
          className="min-h-[76px] rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[#eef2f7]">{row.title}</div>
              <p className="mt-1 truncate text-[12px] leading-5 text-[#8f99ab]">{row.copy}</p>
            </div>
            <span className={`shrink-0 rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${attributionStateClass(row.state)}`}>
              {row.state === 'ready' ? '已归因' : row.state === 'review' ? '待确认' : '缺失'}
            </span>
          </div>
          <p className="mt-2 truncate text-[11px] leading-4 text-[#7e8494]">{row.meta}</p>
        </div>
      ))}
    </div>
  );
}

function RowStack({ rows }: { rows: DetailRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map(row => {
        const className = `grid min-h-[54px] gap-2 rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${row.href ? 'text-[#dbe4f0] transition hover:border-[#4e74f8] hover:bg-[#151820]' : ''}`;
        const content = (
          <>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-[#eef2f7]">{row.title}</div>
            <p className="mt-1 truncate text-[12px] leading-5 text-[#8f99ab]">{row.copy}</p>
            {row.freshness ? (
              <p data-entity-health-collector-freshness="last-seen" className="mt-0.5 truncate text-[11px] leading-4 text-[#6f7788]">
                {row.freshness}
              </p>
            ) : null}
          </div>
          <span className={`inline-flex max-w-full items-center justify-center truncate rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${rowStatusClass(row)}`}>
            {row.meta}
          </span>
          </>
        );

        return row.href ? (
          <Link
            key={`${row.title}-${row.copy}-${row.meta}`}
            href={row.href}
            data-entity-health-collector-handoff="collector-cluster"
            className={className}
          >
            {content}
          </Link>
        ) : (
          <div key={`${row.title}-${row.copy}-${row.meta}`} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function DetailPanel({
  children,
  copy,
  marker,
  title
}: {
  children: React.ReactNode;
  copy: string;
  marker: string;
  title: string;
}) {
  return (
    <section data-entity-detail-panel={marker} className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.28)]">
      <div className="mb-3 flex min-h-[36px] items-start justify-between gap-3 border-b border-[#252b34] pb-3">
        <div>
          <h2 className="text-[13px] font-semibold text-[#eef2f7]">{title}</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{copy}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function RouteRows({ rows }: { rows: DetailRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <Link
          key={`${row.title}-${row.copy}`}
          href={row.copy.startsWith('/') ? row.copy : '#'}
          className="grid min-h-[54px] gap-2 rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5 text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151820] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        >
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-[#eef2f7]">{row.title}</span>
            <span className="mt-1 block truncate text-[12px] text-[#8f99ab]">{row.copy}</span>
          </span>
          <span className="rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2 py-0.5 text-[11px] font-semibold text-[#cbd5e1]">
            {row.meta}
          </span>
        </Link>
      ))}
    </div>
  );
}

function ContextLinkRows({ rows }: { rows: ContextLinkRow[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(link => (
        <Link
          key={link.key}
          data-entity-detail-context-link={link.key}
          href={link.copy}
          className="grid min-h-[64px] gap-1 rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5 text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151820]"
        >
          <span className="text-[12px] font-semibold text-[#eef2f7]">{link.title}</span>
          <span className="truncate text-[11px] text-[#8f99ab]">{link.copy}</span>
          <span className="mt-1 w-fit rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2 py-0.5 text-[11px] font-semibold text-[#cbd5e1]">
            {link.meta}
          </span>
        </Link>
      ))}
    </div>
  );
}

function InheritedContextRows({ rows }: { rows: IncomingContextRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div data-entity-detail-inherited-context="route-context" className="mb-3 grid gap-2 sm:grid-cols-2">
      {rows.map(row => (
        <div
          key={`${row.label}-${row.value}-${row.meta}`}
          data-entity-detail-inherited-context-row={row.label}
          className="min-h-[52px] rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="shrink-0 text-[11px] font-semibold tracking-[0.08em] text-[#7e8494]">{row.label}</span>
            <span className="min-w-0 truncate text-right text-[12px] font-semibold text-[#eef2f7]">{row.value}</span>
          </div>
          <p className="mt-1 truncate text-[11px] leading-4 text-[#8f99ab]">{row.meta}</p>
        </div>
      ))}
    </div>
  );
}

export function EntityDetailSurface({ detail, routeContext, actionError, isPending, onDelete, onRefresh }: EntityDetailSurfaceProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const entity = detail.entity?.entity || {};
  const entityId = entity.id;
  const title = resolveTitle(detail);
  const facts = buildDetailFacts(entity);
  const metrics = countMetrics(detail);
  const contextLinks = buildEntityContextHandoffLinks(detail, routeContext || 'last-1h');
  const incomingContextRows = buildEntityIncomingContextRows(routeContext);
  const healthRows = buildEntityHealthModel(detail);
  const closeDeleteDialog = () => setDeleteDialogOpen(false);
  const submitDeleteDialog = () => {
    if (!entityId) {
      closeDeleteDialog();
      return;
    }
    closeDeleteDialog();
    onDelete(entityId);
  };

  return (
    <>
      <main
        data-entity-detail-surface="otlp-cold-entity-detail"
        data-entity-detail-style-baseline={coldEntityDetailVisual.canvasName}
        data-entity-detail-layout="full-width-workbench"
        className={coldEntityDetailVisual.canvas.root}
        style={coldEntityDetailVisual.canvas.backgroundStyle}
      >
        <section className={coldEntityDetailVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-entity-detail-header="cold-compact-header" className={coldEntityDetailVisual.panel.hero}>
                <div className="max-w-[920px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">对象优先调查</span>
                    <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] font-semibold text-[#cbd5e1]">实体详情</span>
                  </div>
                  <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#f5f7fb]">{title}</h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">{resolveSubtitle(detail)}</p>
                  <div data-entity-detail-command-row="standard-equal-buttons" className={coldEntityDetailVisual.button.row}>
                    <Link href="/entities" className={coldLinkButtonClassName}>
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      全部实体
                    </Link>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      刷新
                    </Button>
                    {entityId ? (
                      <Link href={`/entities/${entityId}/definition`} className={coldLinkButtonClassName}>
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        编辑定义
                      </Link>
                    ) : null}
                    {entityId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className={coldDangerButtonClassName}
                        data-entity-detail-delete-confirm-trigger="cold-modal"
                        disabled={isPending}
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        删除
                      </Button>
                    ) : null}
                    {entityId ? (
                      <Link href={`/entities/${entityId}/edit`} className={coldPrimaryLinkClassName}>
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        编辑
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

          <div data-entity-detail-count-strip="cold-inline-counts" className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ Icon, label, value }) => (
              <div
                key={label}
                className="flex min-h-[36px] items-center justify-between gap-3 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-3 text-[12px] text-[#a9b0bb]"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#858d9a]" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </span>
                <span className="text-[17px] font-semibold tabular-nums text-[#eef2f7]">{value}</span>
              </div>
            ))}
          </div>

          <div
            data-entity-detail-error="cold-inline-error"
            className={actionError ? 'mb-5 rounded-[4px] border border-[#7f1d1d]/55 bg-[#2a1214] px-4 py-3 text-[12px] text-[#fca5a5]' : 'hidden'}
            aria-hidden={actionError ? undefined : true}
          >
            <span className="font-semibold">操作未完成</span>
            {actionError ? <span className="ml-2">{actionError}</span> : null}
          </div>

          <div data-entity-detail-signal-grid="cold-detail-grid" className="grid items-start gap-5 lg:grid-cols-2">
            <DetailPanel marker="overview" title="上下文" copy="先确认实体身份、归属和运行状态，再进入信号工作台。">
              <div data-entity-detail-overview-panel="cold-overview-panel">
                <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {facts.map(fact => (
                    <div key={fact.label} className="min-h-[36px] rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2">
                      <div className="text-[11px] font-semibold tracking-[0.08em] text-[#7e8494]">{fact.label}</div>
                      <div className="mt-1 truncate text-[12px] font-semibold text-[#eef2f7]">{fact.value}</div>
                    </div>
                  ))}
                </div>
                <RowStack rows={buildOverviewRows(entity, detail)} />
              </div>
            </DetailPanel>

            <DetailPanel marker="context" title="观测上下文" copy="所有跳转都携带实体、服务、环境和时间范围，链路相关入口会继续带 trace/span。">
              <div data-entity-detail-context-center="hertzbeat-entity-context">
                <InheritedContextRows rows={incomingContextRows} />
                <ContextLinkRows rows={contextLinks} />
              </div>
            </DetailPanel>

            <DetailPanel
              marker="health"
              title="轻量健康模型"
              copy="用可用性、错误率、延迟、当前告警、最近异常和采集健康形成轻量评分，暂不展开 SLO 编排。"
            >
              <div
                data-entity-health-model="lightweight-service-health"
                data-entity-health-slo-mode="lightweight-no-slo-authoring"
              >
                <RowStack rows={healthRows} />
              </div>
            </DetailPanel>

            <DetailPanel marker="alerts" title="当前告警" copy="先确认正在影响该实体的告警，再决定静默、抑制、分组或通知闭环。">
              <div data-entity-detail-current-alerts="current-alerts">
                <RowStack rows={buildCurrentAlertRows(detail)} />
              </div>
            </DetailPanel>

            <DetailPanel marker="next" title="下一步" copy="保留服务端建议，但用当前冷峻控制台语言收口。">
              <div data-entity-detail-next-panel="cold-next-panel">
                <RowStack rows={buildNextActionRows(detail, entityId)} />
              </div>
            </DetailPanel>

            <DetailPanel marker="related" title="相关信号" copy="用监控、日志和链路快速判断影响范围。">
              <div data-entity-detail-related-panel="cold-related-panel">
                <RowStack rows={buildSummaryRows(detail)} />
              </div>
            </DetailPanel>

            <DetailPanel marker="relationships" title="上下游关系" copy="关系来自实体归并、调用链、监控对象归属或 CMDB 标签，后续会进入拓扑影响面。">
              <div data-entity-detail-relationships-panel="upstream-downstream">
                <RowStack rows={buildRelationshipRows(detail)} />
              </div>
            </DetailPanel>

            <DetailPanel marker="source" title="采集来源" copy="确认这个实体来自 HertzBeat 监控对象、Collector、OTLP 资源属性还是手工/CMDB 标签。">
              <div data-entity-detail-collection-source-panel="source-template-binding">
                <AttributionRows rows={buildEntityAttributionRows(detail)} />
                <div data-entity-detail-template-binding="monitor-template-binding">
                  <RowStack rows={buildCollectionSourceRows(detail)} />
                </div>
              </div>
            </DetailPanel>

            <DetailPanel marker="drilldown" title="高级入口" copy="只保留真正有用的深层入口，不增加右侧统计装饰。">
              <div data-entity-detail-drilldown-panel="cold-drilldown-panel">
                <RouteRows rows={buildDrilldownRows(entityId)} />
              </div>
            </DetailPanel>

            <div className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 text-[12px] leading-5 text-[#8f99ab] lg:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#eef2f7]">
                <Activity className="h-3.5 w-3.5 text-[#858d9a]" aria-hidden="true" />
                处置节奏
              </div>
              告警、监控和日志入口从这里分流；详情页只做对象上下文，不复制目录页的右侧统计栏。
            </div>
          </div>
        </div>
        </section>
      </main>
      <OverlayDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        title="确认删除实体"
        kicker="对象目录"
        maxWidthClassName="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="default" className={coldButtonClassName} onClick={closeDeleteDialog}>
              取消
            </Button>
            <Button size="sm" variant="default" className={coldDangerButtonClassName} disabled={isPending} onClick={submitDeleteDialog}>
              确认删除
            </Button>
          </div>
        }
      >
        <div data-entity-detail-delete-confirm="cold-modal" className="space-y-3 text-[12px] leading-6 text-[#a9b0bb]">
          <p>
            删除后实体会从对象目录移除，相关监控绑定、遥测上下文和告警排查入口需要重新归并。
          </p>
          <div className="rounded-[3px] border border-[#3f2228] bg-[#181013] px-3 py-2 text-[#f0b8c1]">
            {title} {entityId ? <span className="text-[#8f99ab]">#{entityId}</span> : null}
          </div>
        </div>
      </OverlayDialog>
    </>
  );
}
