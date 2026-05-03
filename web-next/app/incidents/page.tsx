import React from 'react';
import Link from 'next/link';
import { Archive } from 'lucide-react';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import { buildIncidentsPlaceholderState } from '../../lib/incidents-surface/view-model';

function actionClass(variant: 'primary' | 'subtle') {
  const coldOpsVisual = coldOpsCatalogVisual;
  const base =
    'inline-flex h-8 items-center justify-center rounded-[3px] border px-3 text-[12px] font-semibold transition-colors';
  if (variant === 'primary') {
    return `${base} ${coldOpsVisual.button.primaryCompact}`;
  }
  return `${base} ${coldOpsVisual.button.compact} border-[#263041] bg-[#101217] text-[#d5d9e3] hover:border-[#3a465c] hover:bg-[#151820]`;
}

export default function IncidentsPage() {
  const state = buildIncidentsPlaceholderState();
  const coldOpsVisual = coldOpsCatalogVisual;

  return (
    <main
      className={coldOpsVisual.entry.main}
      data-incidents-route="otlp-cold-ops-entry"
      data-incidents-style-baseline={coldOpsVisual.canvasName}
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
            data-incidents-shell-panel="cold-ops-shell-panel"
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
            data-incidents-launch-checklist="cold-ops-static-rail"
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
            className={coldOpsVisual.entry.empty}
            data-incidents-empty-state="cold-ops-domain-adapter"
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
