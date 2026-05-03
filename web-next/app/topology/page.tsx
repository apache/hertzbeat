'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from '../../components/ui/input';
import { useI18n } from '../../components/providers/i18n-provider';
import { Select } from '../../components/ui/select';
import { buildTopologyServiceMap, type TopologyRouteContext, type TopologyServiceEdge, type TopologyServiceNode } from '../../lib/topology-surface/view-model';
import { readSignalRouteContext } from '../../lib/signal-route-context';

const edgeColor: Record<TopologyServiceEdge['tone'], string> = {
  green: '#2fa84f',
  blue: '#2f8ed8',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444'
};

const nodeToneClass: Record<TopologyServiceNode['tone'], string> = {
  success: 'border-[#365a45] bg-[#122017] text-[#d9f7df]',
  warning: 'border-[#786032] bg-[#221b0d] text-[#f6e4b0]',
  danger: 'border-[#80464f] bg-[#241115] text-[#ffd6dc]'
};

const nodeFocusClass: Record<TopologyServiceNode['focus'], string> = {
  normal: '',
  active: 'z-20 ring-2 ring-[#4e74f8] ring-offset-2 ring-offset-[#08090c]',
  related: 'z-10 shadow-[0_18px_54px_rgba(78,116,248,0.22)]',
  dimmed: 'opacity-45'
};

function findNode(nodes: TopologyServiceNode[], id: string) {
  return nodes.find(node => node.id === id);
}

function formatTimeRange(timeRange: string, t: (key: string) => string) {
  if (timeRange === 'last-1h') return t('topology.time.last-1h');
  return timeRange;
}

function readTopologyRouteContext(searchParams: ReturnType<typeof useSearchParams>): TopologyRouteContext {
  return {
    ...readSignalRouteContext(searchParams),
    viewMode: searchParams.get('viewMode') ?? undefined,
    sourceKind: searchParams.get('sourceKind') ?? undefined,
    edgeId: searchParams.get('edgeId') ?? undefined
  };
}

export default function TopologyPage() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const map = buildTopologyServiceMap(readTopologyRouteContext(searchParams), t);
  const primaryNode = map.nodes.find(node => node.id === map.activeNodeId) ?? map.nodes.find(node => node.id === 'svc-checkout') ?? map.nodes[0];

  return (
    <main
      data-topology-route="hertzbeat-entity-topology"
      data-topology-incoming-context={map.filterContext.hasIncomingContext ? 'entity-filter' : 'none'}
      data-topology-active-node-id={map.activeNodeId ?? 'none'}
      data-topology-active-edge-id={map.selectedEdgeId ?? 'none'}
      data-topology-active-view-mode={map.filterContext.viewMode}
      data-topology-active-source-kind={map.filterContext.sourceKind ?? 'all'}
      className="min-h-[calc(100vh-56px)] bg-[#08090c] text-[#f1f3f7]"
    >
      <header className="border-b border-[#252832] bg-[#0b0c0f] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px]">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">{t('topology.kicker')}</div>
            <h1 className="mt-1 text-[26px] font-semibold leading-tight text-[#f5f7fb]">{map.productIdentity}</h1>
            <p className="mt-2 max-w-[760px] text-[13px] leading-6 text-[#a9b0bb]">
              {t('topology.copy')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-[12px] text-[#d6d9e2]">
            <span
              data-topology-filter-environment={map.filterContext.environment}
              className="rounded-[3px] border border-[#252832] bg-[#151821] px-2 py-1 text-[#9ca3b4]"
            >
              {map.filterContext.environment}
            </span>
            <span
              data-topology-filter-time-range={map.filterContext.timeRange}
              className="rounded-[3px] border border-[#252832] bg-[#151821] px-2 py-1 text-[#9ca3b4]"
            >
              {formatTimeRange(map.filterContext.timeRange, t)}
            </span>
            <button type="button" className="h-8 rounded-[3px] border border-[#303542] bg-[#151821] px-3 text-[12px] font-semibold text-[#dfe3ec]">
              {t('topology.refresh')}
            </button>
          </div>
        </div>
        <div data-topology-source-strip="relationship-source-contract" className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {map.sources.map(source => (
            <a
              key={source.kind}
              href={source.href}
              data-topology-source-control="relationship-source"
              data-topology-source-kind={source.kind}
              data-topology-source-active={source.active ? source.kind : 'false'}
              className={`rounded-[4px] border px-3 py-2 transition-colors ${source.active ? 'border-[#4e74f8] bg-[#182238]' : 'border-[#252832] bg-[#101217] hover:border-[#364052] hover:bg-[#131821]'}`}
            >
              <div className="text-[12px] font-semibold text-[#e3e8f0]">{source.label}</div>
              <div className="mt-1 text-[11px] leading-5 text-[#8f99ab]">{source.copy}</div>
            </a>
          ))}
        </div>
      </header>

      <section data-topology-controls="hertzbeat-topology-controls" className="grid gap-2 border-b border-[#252832] bg-[#0b0c0f] px-4 py-3 lg:grid-cols-[180px_minmax(0,1fr)_104px_104px]">
        <Select
          aria-label={t('topology.environment.aria')}
          containerClassName="w-full"
          className="h-8 min-w-0 text-[#9da6b8]"
          defaultValue={map.filterContext.environment}
        >
          <option value="all">{t('topology.environment.all')}</option>
          <option value="dev">dev</option>
          <option value="prod">prod</option>
        </Select>
        <Input
          aria-label={t('topology.search.aria')}
          className="h-8 rounded-[2px] border border-[#303542] bg-[#111318] px-3 text-[12px] text-[#e7eaf1] placeholder:text-[#626b7c]"
          placeholder={t('topology.search.placeholder')}
          defaultValue={map.filterContext.search}
        />
        <button type="button" className="h-8 rounded-[4px] border border-[#303542] bg-[#151821] text-[12px] font-semibold text-[#dfe3ec]">
          {t('topology.view.fit')}
        </button>
        <button type="button" className="h-8 rounded-[4px] border border-[#31405c] bg-[#182238] text-[12px] font-semibold text-[#d8e4ff]">
          {t('topology.locate-entity')}
        </button>
        <div data-topology-filter-summary="incoming-context" className="lg:col-span-4 flex flex-wrap items-center gap-2 text-[12px] text-[#8f99ab]">
          <span className="font-semibold text-[#d6d9e2]">{t('topology.current-filter')}</span>
          <span>{map.filterContext.search || t('topology.all-entities')}</span>
          <span>{map.filterContext.environment}</span>
          <span>{map.filterContext.timeRange}</span>
          <span>{map.viewModes.find(mode => mode.active)?.label}</span>
          {map.filterContext.sourceKind ? <span>{map.sources.find(source => source.kind === map.filterContext.sourceKind)?.label}</span> : null}
        </div>
      </section>

      {map.faultContextRows.length > 0 ? (
        <section data-topology-fault-context="incoming-evidence" className="border-b border-[#252832] bg-[#0b0c0f] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[12px] font-semibold text-[#e3e8f0]">{t('topology.fault-context.title')}</div>
            <div className="text-[12px] text-[#8f99ab]">{t('topology.fault-context.copy')}</div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {map.faultContextRows.map(row => (
              <div
                key={row.label}
                data-topology-fault-context-row={row.label}
                className="min-w-0 border-l border-[#31405c] bg-[#101217] px-3 py-2"
              >
                <div className="text-[11px] font-semibold text-[#7e8494]">{row.label}</div>
                <div className="mt-1 truncate text-[12px] font-semibold text-[#e3e8f0]" title={row.value}>{row.value}</div>
                <div className="mt-1 truncate text-[11px] text-[#8f99ab]" title={row.meta}>{row.meta}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid min-h-[760px] bg-[#08090c] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div data-topology-canvas="hertzbeat-topology-canvas" className="relative min-h-[680px] overflow-hidden bg-[#08090c]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {map.edges.map(edge => {
            const from = findNode(map.nodes, edge.from);
            const to = findNode(map.nodes, edge.to);
            if (!from || !to) return null;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                data-topology-edge="service-edge"
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={edgeColor[edge.tone]}
                strokeWidth="0.25"
                strokeLinecap="round"
                opacity={edge.focus === 'context-muted' ? '0.32' : '0.92'}
                data-topology-edge-id={edge.id}
                data-topology-edge-source={edge.source}
                data-topology-edge-focus={edge.focus}
                data-topology-edge-selected={edge.selected ? 'true' : 'false'}
              />
            );
          })}
        </svg>

        {map.edges.map(edge => {
          const from = findNode(map.nodes, edge.from);
          const to = findNode(map.nodes, edge.to);
          if (!from || !to) return null;
          return (
            <a
              key={`${edge.from}-${edge.to}-dot`}
              href={edge.drilldownHref}
              aria-label={t('topology.edge.evidence.aria', { label: edge.label })}
              data-topology-edge-drilldown={edge.id}
              data-topology-edge-selected={edge.selected ? 'true' : 'false'}
              className={`absolute h-2 w-2 rounded-[2px] border ${edge.selected ? 'border-[#c8d5ff] shadow-[0_0_0_4px_rgba(78,116,248,0.22)]' : 'border-transparent'}`}
              style={{
                left: `${(from.x + to.x) / 2}%`,
                top: `${(from.y + to.y) / 2}%`,
                backgroundColor: edgeColor[edge.tone],
                transform: 'translate(-50%, -50%)'
              }}
            />
          );
        })}

        {map.nodes.map(node => (
          <a
            key={node.id}
            href={node.links.entityHref}
            data-topology-node="service-node"
            data-topology-node-id={node.id}
            data-topology-node-focus={node.focus}
            data-topology-node-active={node.focus === 'active' ? 'true' : 'false'}
            data-topology-node-entity-type={node.entityType}
            data-topology-node-source={node.source}
            data-topology-node-health-affordance="lightweight-service-health"
            data-topology-node-health-score={node.healthAffordance.score}
            data-topology-node-entity-href={node.links.entityHref}
            className={`absolute flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[4px] border px-2 py-1 text-center text-[12px] font-semibold shadow-[0_16px_48px_rgba(0,0,0,0.35)] ${nodeToneClass[node.tone]} ${nodeFocusClass[node.focus]}`}
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: node.size,
              height: node.size,
              transform: 'translate(-50%, -50%)'
            }}
            aria-label={node.label}
          >
            <span className="w-full truncate leading-tight">{node.label}</span>
            <span
              data-topology-node-health-copy="lightweight-service-health"
              className="w-full truncate text-[10px] font-medium leading-3 text-[#a9b0bb]"
              title={`${node.healthAffordance.label} · ${node.healthAffordance.copy}`}
            >
              {node.healthAffordance.label}
            </span>
          </a>
        ))}
        </div>
        <aside className="border-t border-[#252832] bg-[#0b0c0f] p-4 xl:border-l xl:border-t-0">
          <div className="text-[12px] font-semibold tracking-[0.12em] text-[#7e8494]">{t('topology.aside.view')}</div>
          <div className="mt-3 grid gap-2">
            {map.viewModes.map(mode => (
              <a
                key={mode.key}
                aria-current={mode.active ? 'page' : undefined}
                href={mode.href}
                data-topology-view-mode={mode.key}
                data-topology-view-mode-active={mode.active ? mode.key : 'false'}
                className={`rounded-[4px] border px-3 py-2 text-left ${mode.active ? 'border-[#4e74f8] bg-[#182238]' : 'border-[#252832] bg-[#101217]'}`}
              >
                <span className="text-[13px] font-semibold text-[#eef2f7]">{mode.label}</span>
                <span className="mt-1 block text-[11px] leading-5 text-[#8f99ab]">{mode.copy}</span>
              </a>
            ))}
          </div>
          <a
            data-topology-alert-impact-link="alert-center"
            className="mt-3 block rounded-[4px] border border-[#31405c] bg-[#182238] px-3 py-2 text-[12px] font-semibold text-[#d8e4ff]"
            href={map.alertImpactHref}
          >
            {t('topology.alert-impact.open')}
          </a>

          {map.selectedEdge ? (
            <div data-topology-edge-evidence-panel={map.selectedEdge.id} className="mt-5 rounded-[4px] border border-[#252832] bg-[#101217] p-3">
              <div className="text-[12px] font-semibold tracking-[0.12em] text-[#7e8494]">{t('topology.edge.evidence.title')}</div>
              <div className="mt-2 text-[15px] font-semibold text-[#f5f7fb]">{map.selectedEdge.evidence.title}</div>
              <div className="mt-1 text-[12px] text-[#8f99ab]">{map.selectedEdge.evidence.sourceLabel} · {map.selectedEdge.evidence.collectedBy}</div>
              <div
                data-topology-edge-evidence-boundary="roadmap-boundary"
                className="mt-3 border-l border-[#4b5566] bg-[#0b0c0f] px-3 py-2 text-[12px] leading-5 text-[#a9b0bb]"
              >
                {map.selectedEdge.evidence.boundary}
              </div>
              <div className="mt-3 grid gap-2">
                {map.selectedEdge.evidence.rows.map(row => (
                  <div key={`${row.label}-${row.value}`} className="rounded-[3px] border border-[#252832] bg-[#0b0c0f] px-2 py-2">
                    <div className="text-[11px] font-semibold text-[#7e8494]">{row.label}</div>
                    <div className="mt-1 text-[12px] font-semibold text-[#e3e8f0]">{row.value}</div>
                    <div className="mt-1 text-[11px] text-[#8f99ab]">{row.meta}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  data-topology-edge-link="from-entity"
                  className="rounded-[3px] border border-[#303542] bg-[#151821] px-3 py-1.5 text-[12px] font-semibold text-[#dfe3ec]"
                  href={map.selectedEdge.links.fromEntityHref}
                >
                  {t('topology.edge.link.from-entity')}
                </a>
                <a
                  data-topology-edge-link="to-entity"
                  className="rounded-[3px] border border-[#303542] bg-[#151821] px-3 py-1.5 text-[12px] font-semibold text-[#dfe3ec]"
                  href={map.selectedEdge.links.toEntityHref}
                >
                  {t('topology.edge.link.to-entity')}
                </a>
                <a
                  data-topology-edge-link="alert-impact"
                  className="rounded-[3px] border border-[#31405c] bg-[#182238] px-3 py-1.5 text-[12px] font-semibold text-[#d8e4ff]"
                  href={map.selectedEdge.links.alertImpactHref}
                >
                  {t('topology.edge.link.alert-impact')}
                </a>
                <span data-topology-edge-link-copy="alert-impact" className="basis-full text-[11px] leading-5 text-[#8f99ab]">
                  {map.selectedEdge.evidence.alertImpactCopy}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                <a
                  data-topology-edge-link="metrics"
                  className="rounded-[3px] border border-[#31405c] bg-[#182238] px-3 py-1.5 text-[12px] font-semibold text-[#d8e4ff]"
                  href={map.selectedEdge.links.metricsHref}
                >
                  {t('topology.edge.link.metrics')}
                </a>
                <a
                  data-topology-edge-link="logs"
                  className="rounded-[3px] border border-[#303542] bg-[#151821] px-3 py-1.5 text-[12px] font-semibold text-[#dfe3ec]"
                  href={map.selectedEdge.links.logsHref}
                >
                  {t('topology.edge.link.logs')}
                </a>
                <a
                  data-topology-edge-link="traces"
                  className="rounded-[3px] border border-[#303542] bg-[#151821] px-3 py-1.5 text-[12px] font-semibold text-[#dfe3ec]"
                  href={map.selectedEdge.links.tracesHref}
                >
                  {t('topology.edge.link.traces')}
                </a>
              </div>
            </div>
          ) : null}

          {primaryNode ? (
            <div className="mt-5 rounded-[4px] border border-[#252832] bg-[#101217] p-3">
              <div className="text-[12px] font-semibold tracking-[0.12em] text-[#7e8494]">{t('topology.current-entity')}</div>
              <div className="mt-2 text-[16px] font-semibold text-[#f5f7fb]">{primaryNode.label}</div>
              <div className="mt-2 grid gap-1 text-[12px] text-[#a9b0bb]">
                <span>{primaryNode.entityId}</span>
                <span>{primaryNode.namespace} / {primaryNode.environment}</span>
                <span>{t('topology.current-entity.signals', { signals: primaryNode.signals.join(', ') })}</span>
                <span data-topology-current-entity-health="lightweight-service-health">
                  {primaryNode.healthAffordance.label} · {primaryNode.healthAffordance.copy}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  data-topology-context-link="entity"
                  className="rounded-[3px] border border-[#303542] bg-[#151821] px-3 py-1.5 text-[12px] font-semibold text-[#dfe3ec]"
                  href={primaryNode.links.entityHref}
                >
                  {t('topology.context-link.entity')}
                </a>
              </div>
              <div className="mt-4 border-t border-[#252832] pt-3">
                <div className="text-[12px] font-semibold tracking-[0.12em] text-[#7e8494]">{t('topology.context-link.signals')}</div>
                <div className="mt-2 grid gap-2">
                  <a
                    data-topology-context-link="metrics"
                    className="rounded-[3px] border border-[#31405c] bg-[#182238] px-3 py-1.5 text-[12px] font-semibold text-[#d8e4ff]"
                    href={primaryNode.links.metricsHref}
                  >
                    {t('topology.context-link.metrics')}
                  </a>
                  <a
                    data-topology-context-link="logs"
                    className="rounded-[3px] border border-[#303542] bg-[#151821] px-3 py-1.5 text-[12px] font-semibold text-[#dfe3ec]"
                    href={primaryNode.links.logsHref}
                  >
                    {t('topology.context-link.logs')}
                  </a>
                  <a
                    data-topology-context-link="traces"
                    className="rounded-[3px] border border-[#303542] bg-[#151821] px-3 py-1.5 text-[12px] font-semibold text-[#dfe3ec]"
                    href={primaryNode.links.tracesHref}
                  >
                    {t('topology.context-link.traces')}
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
