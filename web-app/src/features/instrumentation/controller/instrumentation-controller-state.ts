/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { useState } from 'react';

import { emptyDraft, type InstrumentationDraft, type InstrumentationStage } from '../model/instrumentation-flow';
import type { DetectionResponse, RenderResponse } from '../model/instrumentation-v2-contract';

export function useInstrumentationControllerState() {
  const [stage, setStage] = useState<InstrumentationStage>('source');
  const [draft, setDraft] = useState<InstrumentationDraft>(emptyDraft);
  const [guide, setGuide] = useState<RenderResponse>();
  const [token, setToken] = useState('');
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [detection, setDetection] = useState<DetectionResponse>();
  const [detecting, setDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState(false);
  return {
    stage,
    setStage,
    draft,
    setDraft,
    guide,
    setGuide,
    token,
    setToken,
    rendering,
    setRendering,
    renderError,
    setRenderError,
    detection,
    setDetection,
    detecting,
    setDetecting,
    detectionError,
    setDetectionError
  };
}

export type InstrumentationControllerState = ReturnType<typeof useInstrumentationControllerState>;
