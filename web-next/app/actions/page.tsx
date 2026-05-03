import React from 'react';
import Link from 'next/link';
import { Archive } from 'lucide-react';
import { buildActionsPlaceholderState } from '../../lib/actions-surface/view-model';
import type { ActionSuggestionContext } from '../../lib/actions-surface/model';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';

type ActionsSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readActionsSuggestionContext(searchParams: ActionsSearchParams | undefined): ActionSuggestionContext {
  if (!searchParams) return {};
  return {
    start: firstParam(searchParams.start),
    end: firstParam(searchParams.end),
    timeRange: firstParam(searchParams.timeRange),
    entityId: firstParam(searchParams.entityId),
    entityName: firstParam(searchParams.entityName),
    returnTo: firstParam(searchParams.returnTo),
    serviceName: firstParam(searchParams.serviceName),
    serviceNamespace: firstParam(searchParams.serviceNamespace),
    environment: firstParam(searchParams.environment),
    traceId: firstParam(searchParams.traceId),
    spanId: firstParam(searchParams.spanId),
    source: firstParam(searchParams.source),
    collector: firstParam(searchParams.collector),
    template: firstParam(searchParams.template),
    search: firstParam(searchParams.search),
    signal: firstParam(searchParams.signal),
    severity: firstParam(searchParams.severity),
    status: firstParam(searchParams.status),
    alertGroupId: firstParam(searchParams.alertGroupId),
    viewMode: firstParam(searchParams.viewMode),
    sourceKind: firstParam(searchParams.sourceKind),
    edgeId: firstParam(searchParams.edgeId)
  };
}

function actionClass(variant: 'primary' | 'subtle') {
  const coldOpsVisual = coldOpsCatalogVisual;
  const base =
    'inline-flex h-8 items-center justify-center rounded-[3px] border px-3 text-[12px] font-semibold transition-colors';
  if (variant === 'primary') {
    return `${base} ${coldOpsVisual.button.primaryCompact}`;
  }
  return `${base} ${coldOpsVisual.button.compact} border-[#263041] bg-[#101217] text-[#d5d9e3] hover:border-[#3a465c] hover:bg-[#151820]`;
}

export default function ActionsPage({ searchParams }: { searchParams?: ActionsSearchParams } = {}) {
  const state = buildActionsPlaceholderState(readActionsSuggestionContext(searchParams));
  const coldOpsVisual = coldOpsCatalogVisual;

  return (
    <main
      className={coldOpsVisual.entry.main}
      data-actions-route="otlp-cold-ops-entry"
      data-actions-style-baseline={coldOpsVisual.canvasName}
    >
      <div className={coldOpsVisual.entry.container}>
        <header className={coldOpsVisual.entry.header}>
          <div className={coldOpsVisual.entry.headerLayout}>
            <div>
              <div className={coldOpsVisual.entry.kicker}>{state.kicker}</div>
              <h1 className={coldOpsVisual.entry.title}>{state.title}</h1>
              <p className={coldOpsVisual.entry.subtitle}>{state.subtitle}</p>
            </div>
            <div className={coldOpsVisual.button.row}>
              {state.actions.map(action => (
                <Link className={actionClass(action.variant)} href={action.href} key={action.href}>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </header>

        <div className={coldOpsVisual.entry.grid}>
          <section
            className={coldOpsVisual.entry.panel}
            data-actions-shell-panel="cold-ops-shell-panel"
          >
            <div className={coldOpsVisual.entry.panelEyebrow}>{state.shell.eyebrow}</div>
            <p className={coldOpsVisual.entry.panelCopy}>{state.shell.copy}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {state.shell.chips.map(chip => (
                <span className={coldOpsVisual.entry.chip} key={chip}>
                  {chip}
                </span>
              ))}
            </div>
          </section>

          <aside
            className={coldOpsVisual.entry.rail}
            data-actions-launch-checklist="cold-ops-static-rail"
          >
            <h2 className={coldOpsVisual.entry.railTitle}>{state.checklistTitle}</h2>
            <div className="mt-3 space-y-3">
              {state.checklist.map(item => (
                <div className={coldOpsVisual.entry.checklistItem} key={item.title}>
                  <span className={`${coldOpsVisual.entry.checklistDot} ${item.tone}`} aria-hidden="true" />
                  <div>
                    <div className={coldOpsVisual.entry.checklistTitle}>{item.title}</div>
                    <div className={coldOpsVisual.entry.checklistCopy}>{item.copy}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section
            className={`${coldOpsVisual.entry.panel} lg:col-span-2`}
            data-actions-adapter-boundary={state.adapterBoundary.state}
          >
            <div className={coldOpsVisual.entry.panelEyebrow}>{state.adapterBoundary.label}</div>
            <p className={coldOpsVisual.entry.panelCopy}>{state.adapterBoundary.copy}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {state.adapterBoundary.roadmapOnly.map(item => (
                <span className={coldOpsVisual.entry.chip} key={item}>
                  {item}
                </span>
              ))}
            </div>
          </section>

          {state.suggestedActions.length > 0 ? (
            <section
              className={`${coldOpsVisual.entry.panel} lg:col-span-2`}
              data-actions-suggested-remediation="alert-context-human-confirmation"
            >
              <div className={coldOpsVisual.entry.panelEyebrow}>建议动作</div>
              <p className={coldOpsVisual.entry.panelCopy}>来自告警、实体和三信号上下文，只生成建议，不自动执行。</p>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {state.suggestedActions.map(action => (
                  <div
                    key={action.id}
                    data-actions-suggested-action={action.id}
                    className="rounded-[4px] border border-[#303743] bg-[#101217] px-3 py-3"
                  >
                    <div className="text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]">{action.risk} · {action.catalogId}</div>
                    <div className="mt-2 text-[13px] font-semibold text-[#eef2f7]">{action.title}</div>
                    <div className="mt-1 text-[12px] leading-5 text-[#8f99ab]">{action.copy}</div>
                    <div className="mt-2 text-[11px] leading-4 text-[#7e8494]">{action.evidence}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        data-actions-suggested-action-evidence={action.id}
                        href={action.evidenceHref}
                        className="inline-flex h-7 items-center rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2.5 text-[12px] font-semibold text-[#dbe4f0]"
                      >
                        查看证据
                      </Link>
                      <button
                        type="button"
                        disabled
                        data-actions-suggested-action-confirm={action.confirmation}
                        className="inline-flex h-7 items-center rounded-[3px] border border-[#31405c] bg-[#182238] px-2.5 text-[12px] font-semibold text-[#d8e4ff] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        人工确认后执行
                      </button>
                    </div>
                    <div className="mt-2 text-[11px] leading-4 text-[#8f99ab]">{action.posture}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section
            className={coldOpsVisual.entry.empty}
            data-actions-empty-state="cold-ops-domain-adapter"
          >
            <div className="max-w-[720px] text-center">
              <div className={coldOpsVisual.entry.emptyIcon}>
                <Archive aria-hidden="true" size={22} strokeWidth={1.8} />
              </div>
              <h2 className={coldOpsVisual.entry.emptyTitle}>{state.empty.title}</h2>
              <p className={coldOpsVisual.entry.emptyCopy}>{state.empty.copy}</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
