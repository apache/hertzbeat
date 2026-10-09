/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TraceInvestigationViewState } from '../model/explore-investigation-contract';
import { InvestigationMetrics } from './explore-investigation-metrics';
import { investigationPrimitiveMessages } from './explore-investigation-messages';
import { InvestigationBlockState, InvestigationSection } from './explore-investigation-view-primitives';
import traceStyles from './explore-investigation-trace.module.css';
import workspaceStyles from './explore-trace-workspace.module.css';

type ReadyState = Extract<TraceInvestigationViewState, { kind: 'ready' }>;
type Props = {
  state: ReadyState;
  evidenceCurrent: boolean;
  onOpenMetrics?: (() => void) | undefined;
  onOpenTopology?: (() => void) | undefined;
};

export function TraceSupportingEvidence(props: Props) {
  const { t } = useTranslation();
  return (
    <section className={workspaceStyles.supportingEvidence}>
      <div className={workspaceStyles.supportingActions}>
        {props.onOpenMetrics && (
          <Button disabled={!props.evidenceCurrent} onClick={props.onOpenMetrics}>
            {t('exploreInvestigation.actions.openMetrics')}
          </Button>
        )}
        {props.onOpenTopology && (
          <Button disabled={!props.evidenceCurrent} onClick={props.onOpenTopology}>
            {t('exploreInvestigation.actions.openTopology')}
          </Button>
        )}
      </div>
      <details>
        <summary>
          {t('exploreInvestigation.sections.metrics')} · {t('exploreInvestigation.sections.topology')}
        </summary>
        <MetricsSection
          state={props.state}
          evidenceCurrent={props.evidenceCurrent}
          messages={investigationPrimitiveMessages(t)}
        />
        <TopologySection state={props.state} evidenceCurrent={props.evidenceCurrent} />
      </details>
    </section>
  );
}

function MetricsSection({
  state,
  evidenceCurrent,
  messages
}: {
  state: ReadyState;
  evidenceCurrent: boolean;
  messages: ReturnType<typeof investigationPrimitiveMessages>;
}) {
  const { t } = useTranslation();
  return (
    <InvestigationSection title={t('exploreInvestigation.sections.metrics')} evidenceCurrent={evidenceCurrent}>
      <div className={workspaceStyles.pendingEvidence} aria-busy={!evidenceCurrent}>
        {!evidenceCurrent ? (
          <span className={workspaceStyles.pendingLabel}>{t('exploreInvestigation.trace.updatingSelection')}</span>
        ) : null}
        <InvestigationMetrics
          red={state.snapshot.red}
          metricBlock={state.snapshot.metrics}
          panels={state.perses.metrics}
          messages={messages}
        />
      </div>
    </InvestigationSection>
  );
}

function TopologySection({ state, evidenceCurrent }: { state: ReadyState; evidenceCurrent: boolean }) {
  const { t } = useTranslation();
  const block = state.snapshot.dependencies;
  return (
    <InvestigationSection title={t('exploreInvestigation.sections.topology')} evidenceCurrent={evidenceCurrent}>
      {block.state === 'ready' ? (
        <div className={traceStyles.dependencies}>
          <p>{t('exploreInvestigation.topology.scope')}</p>
          <ul>
            {block.edges.map(edge => (
              <li key={`${edge.spanId}-${edge.sourceServiceName}-${edge.targetServiceName}`}>
                <strong>{`${edge.sourceServiceName} → ${edge.targetServiceName}`}</strong>
                <span>
                  {t('exploreInvestigation.topology.downstream')} · {edge.status} · {edge.durationMillis} ms
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <InvestigationBlockState state={block.state} reason={block.reason} />
      )}
    </InvestigationSection>
  );
}
