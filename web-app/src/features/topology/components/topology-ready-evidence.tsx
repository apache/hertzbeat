/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

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
  const partialDescription = presentation.summary.partialReasons
    .map(reason => t(reason === 'entity_seed_limit' ? 'topology.partial.entitySeedLimit' : 'topology.partial.edgePage'))
    .join(' · ');
  return (
    <>
      {refreshFailure ? (
        <OperationalStatePanel kind="unavailable" title={t('topology.evidence.refreshFailure')} />
      ) : null}
      {presentation.summary.partial ? (
        <OperationalStatePanel
          kind="unavailable"
          title={t('topology.partial.title')}
          description={partialDescription}
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
    <OperationalStatePanel
      kind={state.kind === 'failure' ? 'error' : 'loading'}
      title={t(`topology.evidence.runtime${state.kind === 'failure' ? 'Failure' : 'Loading'}`)}
    />
  );
}
