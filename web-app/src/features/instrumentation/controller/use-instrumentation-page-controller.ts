/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  detectInstrumentationSignals,
  loadInstrumentationCatalog,
  loadIntakeProfiles,
  renderInstrumentationGuide
} from '../api/instrumentation-api';
import {
  buildDetectionRequest,
  buildQueryJump,
  buildRenderRequest,
  draftReady,
  emptyDraft,
  materializeBlock,
  selectRecipe,
  selectSource,
  type InstrumentationDraft
} from '../model/instrumentation-flow';
import type {
  DetectionResponse,
  GuideBlock,
  Recipe,
  RenderResponse,
  Signal,
  SourceKind
} from '../model/instrumentation-v2-contract';

const keys = {
  catalog: ['instrumentation', 'v2', 'catalog'] as const,
  profiles: ['instrumentation', 'v2', 'intake-profiles'] as const
};

export type InstrumentationStage = 'source' | 'context' | 'install' | 'detect';

export function useInstrumentationPageController() {
  const navigate = useNavigate();
  const catalogQuery = useQuery({
    queryKey: keys.catalog,
    queryFn: ({ signal }) => loadInstrumentationCatalog(signal)
  });
  const profilesQuery = useQuery({ queryKey: keys.profiles, queryFn: ({ signal }) => loadIntakeProfiles(signal) });
  const [stage, setStage] = useState<InstrumentationStage>('source');
  const [draft, setDraft] = useState<InstrumentationDraft>(emptyDraft);
  const [guide, setGuide] = useState<RenderResponse>();
  const [token, setToken] = useState('');
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [detection, setDetection] = useState<DetectionResponse>();
  const [detecting, setDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState(false);
  const startedAt = useRef<number | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  const generation = useRef(0);

  useDefaultProfile(profilesQuery.data?.defaultProfileId, setDraft);
  useEffect(
    () => () => {
      // Token state is destroyed with this controller and is never persisted.
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const resetResults = useCallback(() => {
    generation.current += 1;
    setGuide(undefined);
    setDetection(undefined);
    setRenderError(false);
    setDetectionError(false);
    setToken('');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = undefined;
    startedAt.current = undefined;
  }, []);
  const chooseSource = useCallback(
    (kind: SourceKind) => {
      if (!catalogQuery.data) return;
      resetResults();
      setDraft({
        ...selectSource(catalogQuery.data, kind),
        intakeProfileId: profilesQuery.data?.defaultProfileId ?? ''
      });
    },
    [catalogQuery.data, profilesQuery.data?.defaultProfileId, resetResults]
  );
  const chooseRecipe = useCallback(
    (recipe: Recipe) => {
      resetResults();
      setDraft(current => selectRecipe(current, recipe));
    },
    [resetResults]
  );
  const patchDraft = useCallback(
    (patch: Partial<InstrumentationDraft>) => {
      resetResults();
      setDraft(current => ({ ...current, ...patch }));
    },
    [resetResults]
  );
  const patchService = useCallback(
    (patch: Partial<InstrumentationDraft['service']>) => {
      resetResults();
      setDraft(current => ({ ...current, service: { ...current.service, ...patch } }));
    },
    [resetResults]
  );
  const renderGuide = useCallback(async () => {
    const currentGeneration = generation.current;
    setRendering(true);
    setRenderError(false);
    try {
      const value = await renderInstrumentationGuide(buildRenderRequest(draft));
      if (generation.current !== currentGeneration) return;
      setGuide(value);
      setStage('install');
    } catch {
      if (generation.current !== currentGeneration) return;
      setRenderError(true);
    } finally {
      if (generation.current === currentGeneration) setRendering(false);
    }
  }, [draft]);
  const copyBlock = useCallback(
    async (block: GuideBlock) => {
      if (!block.content) return;
      await navigator.clipboard.writeText(materializeBlock(block.content, block.placeholders, token));
    },
    [token]
  );
  const detect = useDetection(draft, setDetection, setDetecting, setDetectionError, startedAt, timer, generation);
  const openQuery = useCallback(
    (signal: Signal) => {
      const jump = detection?.queryJumps.find(item => item.signal === signal);
      if (jump?.enabled) navigate(buildQueryJump(jump.signal, jump.context));
    },
    [detection, navigate]
  );
  const reset = useCallback(() => {
    resetResults();
    setDraft(emptyDraft());
    setStage('source');
  }, [resetResults]);

  return {
    stage,
    setStage,
    draft,
    catalog: catalogQuery.data,
    catalogState: queryState(catalogQuery),
    profiles: profilesQuery.data,
    profilesState: queryState(profilesQuery),
    chooseSource,
    chooseRecipe,
    patchDraft,
    patchService,
    guide,
    rendering,
    renderError,
    renderGuide,
    token,
    setToken,
    copyBlock,
    detection,
    detecting,
    detectionError,
    detect,
    openQuery,
    canRender: draftReady(draft),
    reset
  };
}

function useDefaultProfile(
  defaultId: string | undefined,
  setDraft: (value: React.SetStateAction<InstrumentationDraft>) => void
) {
  useEffect(() => {
    if (!defaultId) return;
    setDraft(current => (current.intakeProfileId ? current : { ...current, intakeProfileId: defaultId }));
  }, [defaultId, setDraft]);
}

function useDetection(
  draft: InstrumentationDraft,
  setDetection: (value: DetectionResponse | undefined) => void,
  setDetecting: (value: boolean) => void,
  setDetectionError: (value: boolean) => void,
  startedAt: React.RefObject<number | undefined>,
  timer: React.RefObject<number | undefined>,
  generation: React.RefObject<number>
) {
  const run = useCallback(async () => {
    const currentGeneration = generation.current;
    const start = startedAt.current ?? Date.now();
    startedAt.current = start;
    setDetecting(true);
    setDetectionError(false);
    try {
      const response = await detectInstrumentationSignals(buildDetectionRequest(draft, start));
      if (generation.current !== currentGeneration) return;
      setDetection(response);
      if (response.polling.decision === 'continue_polling' && Date.now() < response.polling.deadlineAt) {
        const remaining = response.polling.deadlineAt - Date.now();
        const delay = response.polling.pollAfterMs;
        if (delay && delay <= remaining) timer.current = window.setTimeout(() => void run(), delay);
        else setDetecting(false);
      } else {
        setDetecting(false);
      }
    } catch {
      if (generation.current !== currentGeneration) return;
      setDetecting(false);
      setDetectionError(true);
      setDetection(undefined);
    }
  }, [draft, generation, setDetection, setDetecting, setDetectionError, startedAt, timer]);
  return run;
}

function queryState(query: { isPending: boolean; error: unknown }) {
  return query.isPending ? ('loading' as const) : query.error ? ('error' as const) : ('ready' as const);
}
