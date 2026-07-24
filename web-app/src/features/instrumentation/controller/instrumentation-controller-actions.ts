/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { useCallback, type RefObject } from 'react';

import { renderInstrumentationGuide } from '../api/instrumentation-api';
import {
  answerApplicationQuestion,
  buildRenderRequest,
  emptyDraft,
  materializeBlock,
  selectSource,
  type ApplicationQuestion,
  type InstrumentationDraft
} from '../model/instrumentation-flow';
import type { CatalogResponse, GuideBlock, SourceKind } from '../model/instrumentation-v2-contract';
import type { InstrumentationControllerState } from './instrumentation-controller-state';

export function useDraftActions(
  state: InstrumentationControllerState,
  catalog: CatalogResponse | undefined,
  defaultProfileId: string | undefined,
  startedAtRef: RefObject<number | undefined>,
  timerRef: RefObject<number | undefined>,
  generationRef: RefObject<number>
) {
  const resetResults = useCallback(() => {
    generationRef.current += 1;
    state.setGuide(undefined);
    state.setDetection(undefined);
    state.setRenderError(false);
    state.setDetectionError(false);
    state.setToken('');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    startedAtRef.current = undefined;
  }, [generationRef, startedAtRef, state, timerRef]);
  const chooseSource = useCallback(
    (kind: SourceKind) => {
      if (!catalog) return;
      resetResults();
      state.setDraft({ ...selectSource(catalog, kind), intakeProfileId: defaultProfileId ?? '' });
    },
    [catalog, defaultProfileId, resetResults, state]
  );
  const answerApplication = useCallback(
    (field: ApplicationQuestion, value: string) => {
      if (!catalog) return;
      resetResults();
      state.setDraft(current => answerApplicationQuestion(current, catalog, field, value));
    },
    [catalog, resetResults, state]
  );
  const patchDraft = useCallback(
    (patch: Partial<InstrumentationDraft>) => {
      resetResults();
      state.setDraft(current => ({ ...current, ...patch }));
    },
    [resetResults, state]
  );
  const patchService = useCallback(
    (patch: Partial<InstrumentationDraft['service']>) => {
      resetResults();
      state.setDraft(current => ({ ...current, service: { ...current.service, ...patch } }));
    },
    [resetResults, state]
  );
  const reset = useCallback(() => {
    resetResults();
    const initialDraft = catalog ? selectSource(catalog, 'quick_start') : emptyDraft();
    state.setDraft({ ...initialDraft, intakeProfileId: defaultProfileId ?? '' });
    state.setStage('source');
  }, [catalog, defaultProfileId, resetResults, state]);
  return { chooseSource, answerApplication, patchDraft, patchService, reset };
}

export function useGuideActions(state: InstrumentationControllerState, generationRef: RefObject<number>) {
  const renderGuide = useCallback(async () => {
    const currentGeneration = generationRef.current;
    state.setRendering(true);
    state.setRenderError(false);
    try {
      const value = await renderInstrumentationGuide(buildRenderRequest(state.draft));
      if (generationRef.current !== currentGeneration) return;
      state.setGuide(value);
      state.setStage('install');
    } catch {
      if (generationRef.current !== currentGeneration) return;
      state.setRenderError(true);
    } finally {
      if (generationRef.current === currentGeneration) state.setRendering(false);
    }
  }, [generationRef, state]);
  const copyBlock = useCallback(
    async (block: GuideBlock) => {
      if (!block.content) return;
      await navigator.clipboard.writeText(materializeBlock(block.content, block.placeholders, state.token));
    },
    [state.token]
  );
  return { renderGuide, copyBlock };
}
