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
import {
  parseLogCalculatedV2,
  appendCalculatedFormula,
  updateCalculatedFormula
} from '../model/explore-log-calculated-v2';
import { validationError, validationPath } from '../model/explore-calculated-validation-issue';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';

export function useCalculatedEditor(
  raw: string | undefined,
  editingId: string | undefined,
  search: string | undefined,
  sort: string | undefined,
  analysis: string | undefined,
  validate: ValidateCalculatedFields,
  onClose: () => void,
  onApply: (raw: string) => void,
  initialExpression?: string
) {
  const state = parseLogCalculatedV2(raw);
  const editing = state?.fields.find(field => field.id === editingId && field.kind === 'formula');
  const [name, setName] = useState(
    editing?.kind === 'formula' ? editing.name : `calculated${state?.nextFieldSeq ?? 1}`
  );
  const [expression, setExpression] = useState(
    editing?.kind === 'formula' ? editing.expression : (initialExpression ?? '')
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [errorPath, setErrorPath] = useState<string>();
  const active = useRef<AbortController>();
  const mounted = useRef(true);
  useAbortOnUnmount(active, mounted);
  const candidate = editingId
    ? updateCalculatedFormula(raw, editingId, name.trim(), expression.trim(), search, sort, analysis)
    : appendCalculatedFormula(raw, name.trim(), expression.trim());
  const cancel = () => {
    active.current?.abort();
    onClose();
  };
  const editName = (value: string) => editValue(active, setName, value);
  const editExpression = (value: string) => editValue(active, setExpression, value);
  const save = async () => {
    if (!candidate || pending) return;
    const request = new AbortController();
    active.current = request;
    setPending(true);
    setError(undefined);
    setErrorPath(undefined);
    try {
      const result = await validate(candidate, undefined, request.signal);
      if (request.signal.aborted || !mounted.current) return;
      if (!result.valid) {
        setError(validationError(result.errors));
        setErrorPath(validationPath(result.errors));
        return;
      }
      onApply(candidate);
      onClose();
    } catch {
      if (!request.signal.aborted && mounted.current) setError('unavailable');
    } finally {
      if (mounted.current) setPending(false);
      if (active.current === request) active.current = undefined;
    }
  };
  return { name, expression, pending, error, errorPath, candidate, cancel, editName, editExpression, save };
}

function useAbortOnUnmount(activeRef: { current: AbortController | undefined }, mountedRef: { current: boolean }) {
  useEffect(() => {
    mountedRef.current = true;
    const abort = () => activeRef.current?.abort();
    return () => {
      mountedRef.current = false;
      abort();
    };
  }, [activeRef, mountedRef]);
}

function editValue(active: { current: AbortController | undefined }, set: (value: string) => void, value: string) {
  active.current?.abort();
  set(value);
}
