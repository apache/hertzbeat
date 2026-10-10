/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ReactNode } from 'react';
import { Button, Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { TraceExploreQuery } from '../model/explore-query';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { useTraceStructureAnalysis } from '../controller/use-trace-structure-analysis';
import { buildTraceInvestigationPath } from '../model/explore-investigation-model';
import type { TraceStructureAnalysis } from '../model/explore-trace-structure-analysis';
import { ExploreTraceFlowMap } from '../components/explore-trace-flow-map';
import styles from '../components/explore-trace-population.module.css';

type Controller = ReturnType<typeof useExplorePageController>;
type Props = { controller: Controller; query: TraceExploreQuery; children: ReactNode };

export function ExploreTraceStructureResults({ controller, query, children }: Props) {
  const { t } = useTranslation();
  const evidence =
    controller.result.kind === 'refreshing' || controller.result.kind === 'stale_error'
      ? controller.result.evidence
      : controller.result;
  const window = 'window' in evidence ? evidence.window : undefined;
  const revision = 'revision' in evidence ? evidence.revision : 0;
  const mode = query.traceStructureView ?? 'list';
  const analysis = useTraceStructureAnalysis(query, window, mode !== 'list', revision);
  const open = (traceId: string, spanId?: string) => {
    if (!window) return;
    controller.openPath(
      buildTraceInvestigationPath(
        query,
        {
          traceId,
          selectedSpanId: spanId,
          startTime: null,
          durationNanos: null
        },
        window,
        Intl.DateTimeFormat().resolvedOptions().timeZone
      )
    );
  };
  return (
    <>
      <div className={styles.toolbar}>
        <Segmented
          aria-label={t('exploreTrace.structure.viewLabel')}
          value={mode}
          options={(['list', 'patterns', 'flow'] as const).map(value => ({
            value,
            label: t(`exploreTrace.structure.views.${value}`)
          }))}
          onChange={value =>
            controller.updateQuery({
              traceStructureView: value === 'patterns' || value === 'flow' ? value : undefined
            })
          }
        />
      </div>
      {controller.result.kind === 'stale_error' && (
        <p className={styles.hint} role="alert">
          {t('exploreTrace.structure.staleAnalysis')}{' '}
          <Button size="small" onClick={() => void controller.refresh()}>
            {t('common.retry')}
          </Button>
        </p>
      )}
      {mode === 'list' || !window ? (
        children
      ) : (
        <StructureAnalysisContent analysis={analysis} mode={mode} window={window} open={open} />
      )}
    </>
  );
}

function StructureAnalysisContent({
  analysis,
  mode,
  window,
  open
}: {
  analysis: ReturnType<typeof useTraceStructureAnalysis>;
  mode: 'patterns' | 'flow';
  window: ExactTimeWindow | undefined;
  open: (traceId: string, spanId?: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.result}>
      {analysis.state === 'loading' && (
        <p className={styles.hint} role="status">
          {t('explore.states.refreshing')}
        </p>
      )}
      {analysis.state === 'permission' && <p role="alert">{t('common.permission.roleRequiredDescription')}</p>}
      {['transport_error', 'contract_error', 'invalid_query', 'invalid_filter', 'error', 'missing'].includes(
        analysis.state
      ) && (
        <p className={styles.hint} role="alert">
          {t('exploreTrace.structure.analysisUnavailable')}{' '}
          <Button size="small" onClick={analysis.retry}>
            {t('common.retry')}
          </Button>
        </p>
      )}
      {analysis.data && window && (
        <>
          <p className={styles.hint}>
            {t('exploreTrace.structure.analysisCoverage', {
              traces: analysis.data.matchedTraces,
              rows: analysis.data.scannedRows,
              limit: analysis.data.rowLimit
            })}
            {analysis.data.truncated && ` ${t('exploreTrace.structure.truncated')}`}
          </p>
          {mode === 'patterns' ? (
            <PatternRows data={analysis.data} open={open} />
          ) : (
            <FlowRows data={analysis.data} open={open} />
          )}
        </>
      )}
    </div>
  );
}

function PatternRows({ data, open }: { data: TraceStructureAnalysis; open: (traceId: string) => void }) {
  const { t } = useTranslation();
  if (!data.patterns.length) return <p className={styles.hint}>{t('exploreTrace.structure.noPatterns')}</p>;
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t('exploreTrace.structure.patternShape')}</th>
            <th>{t('exploreTrace.structure.traceCount')}</th>
            <th>{t('exploreTrace.structure.example')}</th>
          </tr>
        </thead>
        <tbody>
          {data.patterns.map((pattern, index) => (
            <tr key={index}>
              <td>
                {pattern.shape
                  .map(shape => {
                    const parent = shape.missingParent
                      ? t('exploreTrace.structure.unknownParent')
                      : shape.parentServiceName
                        ? `${shape.parentServiceName} / ${shape.parentOperationName ?? '?'}`
                        : t('exploreTrace.structure.root');
                    return `${parent} → ${shape.serviceName ?? '?'} / ${shape.operationName ?? '?'} [${shape.status ?? '?'}]`;
                  })
                  .join('; ')}
              </td>
              <td>{pattern.traceCount}</td>
              <td>
                {pattern.traceIds[0] && (
                  <Button type="link" onClick={() => open(pattern.traceIds[0]!)}>
                    {pattern.traceIds[0]}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.patternsTruncated && <p className={styles.hint}>{t('exploreTrace.structure.patternsTruncated')}</p>}
    </div>
  );
}

function FlowRows({ data, open }: { data: TraceStructureAnalysis; open: (traceId: string, spanId?: string) => void }) {
  const { t } = useTranslation();
  if (!data.edges.length) return <p className={styles.hint}>{t('exploreTrace.structure.noEdges')}</p>;
  return (
    <div className={styles.scroll}>
      <ExploreTraceFlowMap edges={data.edges} />
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t('exploreTrace.structure.source')}</th>
            <th>{t('exploreTrace.structure.target')}</th>
            <th>{t('exploreTrace.structure.spanCount')}</th>
            <th>{t('exploreTrace.structure.traceCount')}</th>
            <th>{t('exploreTrace.structure.example')}</th>
          </tr>
        </thead>
        <tbody>
          {data.edges.map(edge => (
            <tr key={`${edge.sourceService}:${edge.targetService}`}>
              <td>{edge.sourceService}</td>
              <td>{edge.targetService}</td>
              <td>{edge.spanCount}</td>
              <td>{edge.traceCount}</td>
              <td>
                <Button type="link" onClick={() => open(edge.exampleTraceId, edge.exampleChildSpanId)}>
                  {edge.exampleTraceId}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.edgesTruncated && <p className={styles.hint}>{t('exploreTrace.structure.edgesTruncated')}</p>}
    </div>
  );
}
