/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';

import type { TopologyPageState } from '../model/topology-page-contract';
import type { TopologyPresentation } from '../model/topology-view-model';
import type { TopologyCanvasRuntimeState } from './topology-canvas';

type Props = {
  refreshFailure: TopologyPageState['refreshFailure'];
  presentation: TopologyPresentation;
  runtimeState: TopologyCanvasRuntimeState;
};

export function TopologyReadyEvidence({ refreshFailure, presentation, runtimeState }: Props) {
  const { t } = useTranslation();
  return (
    <>
      {refreshFailure ? <Alert showIcon type="warning" message={t('topology.evidence.refreshFailure')} /> : null}
      {presentation.summary.partial ? (
        <Alert
          showIcon
          type="warning"
          message={t('topology.partial.title')}
          description={
            <ul>
              {presentation.summary.partialReasons.map(reason => (
                <li key={reason}>
                  {t(reason === 'entity_seed_limit' ? 'topology.partial.entitySeedLimit' : 'topology.partial.edgePage')}
                </li>
              ))}
            </ul>
          }
        />
      ) : null}
      <TopologyRuntimeEvidence state={runtimeState} />
    </>
  );
}

function TopologyRuntimeEvidence({ state }: { state: TopologyCanvasRuntimeState }) {
  const { t } = useTranslation();
  if (state.kind === 'ready') return null;
  return (
    <Alert
      showIcon
      type={state.kind === 'failure' ? 'error' : 'info'}
      message={t(`topology.evidence.runtime${state.kind === 'failure' ? 'Failure' : 'Loading'}`)}
    />
  );
}
