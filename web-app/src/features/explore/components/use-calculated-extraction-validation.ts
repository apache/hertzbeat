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

import { useEffect, useRef, useState } from 'react';
import { parseLogCalculatedV2 } from '../model/explore-log-calculated-v2';
import { validationError, validationPath } from '../model/explore-calculated-validation-issue';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';
import type { ExtractionEditorParams } from './calculated-extraction-editor-contract';
type Params = ExtractionEditorParams;
type Preview = { definitionId: string; values: Record<string, string | number | boolean | null> };
type ValidationResult = Awaited<ReturnType<ValidateCalculatedFields>>;

export function useExtractionValidation(params: Params, candidate: string | undefined, sample: string) {
  const [preview, setPreview] = useState<Preview>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [errorPath, setErrorPath] = useState<string>();
  const { activeRef, mountedRef } = useValidationLifetime();
  const invalidate = () => {
    activeRef.current?.abort();
    activeRef.current = undefined;
    setPending(false);
    setPreview(undefined);
    setError(undefined);
    setErrorPath(undefined);
  };
  const cancel = () => {
    activeRef.current?.abort();
    params.onClose();
  };
  const accept = (result: ValidationResult, sampleOnly: boolean, candidate: string) => {
    if (!result.valid) {
      setError(validationError(result.errors));
      setErrorPath(validationPath(result.errors));
    } else if (sampleOnly) setPreview(result.preview ?? undefined);
    else {
      params.onApply(candidate);
      params.onClose();
    }
  };
  const run = async (sampleOnly: boolean, override?: { candidate: string | undefined; sample: string }) => {
    const requestArgs = validationArguments(
      candidate,
      sample,
      pending,
      sampleOnly,
      override,
      params.editingId,
      setError
    );
    if (!requestArgs) return;
    const request = new AbortController();
    activeRef.current = request;
    setPending(true);
    setError(undefined);
    try {
      const result = await params.validate(requestArgs.candidate, requestArgs.preview, request.signal);
      if (request.signal.aborted || !mountedRef.current) return;
      accept(result, sampleOnly, requestArgs.candidate);
    } catch {
      if (!request.signal.aborted && mountedRef.current) setError('unavailable');
    } finally {
      if (activeRef.current === request) {
        activeRef.current = undefined;
        if (mountedRef.current) setPending(false);
      }
    }
  };
  return { preview, pending, error, errorPath, invalidate, cancel, run };
}

function validationArguments(
  candidate: string | undefined,
  sample: string,
  pending: boolean,
  sampleOnly: boolean,
  override: { candidate: string | undefined; sample: string } | undefined,
  editingId: string | undefined,
  setError: (value: string) => void
) {
  const requestCandidate = override ? override.candidate : candidate;
  const requestSample = override ? override.sample : sample;
  if (!canValidate(requestCandidate, override ? false : pending)) return undefined;
  if (!admitPreview(sampleOnly, requestSample, setError)) return undefined;
  return {
    candidate: requestCandidate,
    preview: sampleOnly ? previewDescriptor(requestCandidate, editingId, requestSample) : undefined
  };
}

function canValidate(candidate: string | undefined, pending: boolean): candidate is string {
  return Boolean(candidate) && !pending;
}

function admitPreview(sampleOnly: boolean, sample: string, setError: (value: string) => void) {
  if (!sampleOnly || new TextEncoder().encode(sample).byteLength <= 16384) return true;
  setError('sampleTooLarge');
  return false;
}

function previewDescriptor(candidate: string, editingId: string | undefined, sourceText: string) {
  const definitionId = editingId ?? parseLogCalculatedV2(candidate)?.fields.at(-1)?.id ?? '';
  return { definitionId, sourceText };
}

function useValidationLifetime() {
  const activeRef = useRef<AbortController>();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    const abort = () => activeRef.current?.abort();
    return () => {
      mountedRef.current = false;
      abort();
    };
  }, []);
  return { activeRef, mountedRef };
}
