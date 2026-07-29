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
  previousApplicationSelection,
  previousInstrumentationStage,
  selectSource,
  type ApplicationQuestion,
  type InstrumentationDraft
} from '../model/instrumentation-flow';
import type { CatalogResponse, GuideBlock, ServiceIdentity } from '../model/instrumentation-v2-contract';
import type { InstrumentationControllerState } from './instrumentation-controller-state';

export function useDraftActions(
  state: InstrumentationControllerState,
  catalog: CatalogResponse | undefined,
  defaultProfileId: string | undefined,
  startedAtRef: RefObject<number | undefined>,
  timerRef: RefObject<number | undefined>,
  generationRef: RefObject<number>
) {
  const resetResults = useResetInstrumentationResults(state, generationRef, startedAtRef, timerRef);
  const chooseSource = useCallback(
    (sourceId: string) => {
      if (!catalog) return;
      resetResults();
      state.setDraft(current => ({
        ...selectSource(catalog, sourceId, current.service),
        intakeProfileId: defaultProfileId ?? ''
      }));
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
    (patch: Partial<ServiceIdentity>) => {
      resetResults();
      state.setDraft(current => ({ ...current, service: { ...current.service, ...patch } }));
    },
    [resetResults, state]
  );
  const reset = useCallback(() => {
    resetResults();
    state.setDraft({ ...emptyDraft(), intakeProfileId: defaultProfileId ?? '' });
    state.setStage('source');
    state.setSourceDirectoryRevision(current => current + 1);
  }, [defaultProfileId, resetResults, state]);
  const goBack = useBackAction(state, resetResults, catalog);
  return { chooseSource, answerApplication, patchDraft, patchService, reset, goBack };
}

function useResetInstrumentationResults(
  state: InstrumentationControllerState,
  generationRef: RefObject<number>,
  startedAtRef: RefObject<number | undefined>,
  timerRef: RefObject<number | undefined>
) {
  return useCallback(() => {
    generationRef.current += 1;
    state.setGuide(undefined);
    state.setDetection(undefined);
    state.setDetecting(false);
    state.setRenderError(false);
    state.setRendering(false);
    state.setDetectionError(false);
    state.setToken('');
    state.setTokenDraft(undefined);
    state.setTokenError(false);
    state.setTokenGenerating(false);
    clearDetectionWindow(timerRef, startedAtRef);
  }, [generationRef, startedAtRef, state, timerRef]);
}

function clearDetectionWindow(timerRef: RefObject<number | undefined>, startedAtRef: RefObject<number | undefined>) {
  if (timerRef.current) window.clearTimeout(timerRef.current);
  timerRef.current = undefined;
  startedAtRef.current = undefined;
}

function useBackAction(
  state: InstrumentationControllerState,
  resetResults: () => void,
  catalog: CatalogResponse | undefined
) {
  return useCallback(() => {
    if (state.stage === 'source') {
      if (!catalog || !state.draft.sourceId) return;
      resetResults();
      state.setDraft(current => previousApplicationSelection(current, catalog));
      state.setSourceDirectoryRevision(current => current + 1);
      return;
    }
    if (state.stage === 'configure') resetResults();
    state.setStage(previousInstrumentationStage(state.stage));
  }, [catalog, resetResults, state]);
}

export function useGuideActions(
  state: InstrumentationControllerState,
  generationRef: RefObject<number>,
  startedAtRef: RefObject<number | undefined>
) {
  const renderGuide = useCallback(async () => {
    const currentGeneration = generationRef.current;
    state.setRendering(true);
    state.setRenderError(false);
    try {
      const value = await renderInstrumentationGuide(buildRenderRequest(state.draft));
      if (generationRef.current !== currentGeneration) return;
      startedAtRef.current = Date.now();
      state.setGuide(value);
    } catch {
      if (generationRef.current !== currentGeneration) return;
      state.setRenderError(true);
    } finally {
      if (generationRef.current === currentGeneration) state.setRendering(false);
    }
  }, [generationRef, startedAtRef, state]);
  const copyBlock = useCallback(
    async (block: GuideBlock) => {
      if (!block.content) return;
      await navigator.clipboard.writeText(materializeBlock(block.content, block.placeholders, state.token));
    },
    [state.token]
  );
  return { renderGuide, copyBlock };
}
