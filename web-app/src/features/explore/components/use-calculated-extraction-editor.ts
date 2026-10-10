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

import { useState } from 'react';
import { parseLogCalculatedV2 } from '../model/explore-log-calculated-v2';
import type { ExtractionEditorParams } from './calculated-extraction-editor-contract';
import { useExtractionValidation } from './use-calculated-extraction-validation';
import { generateExtraction, captureNames, extractionCandidate } from './calculated-extraction-definition';

type Params = ExtractionEditorParams;

export function useExtractionEditor(params: Params) {
  const initial = initialExtraction(params);
  const [engine, changeEngine] = useState<'regex' | 'grok'>(initial?.engine ?? 'grok');
  const [source, changeSource] = useState(initial?.source ?? 'builtin:body');
  const [pattern, changePattern] = useState(initial?.pattern ?? '');
  const [captureText, changeCaptureText] = useState(initial?.captures.map(item => item.name).join(', ') ?? '');
  const [sample, changeSample] = useState('');
  const names = captureText
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);
  const capturePatternMissing = Boolean(pattern.trim()) && names.length === 0;
  const candidate = extractionCandidate(params, engine, source, pattern, names);
  const validation = useExtractionValidation(params, candidate, sample);
  const change = <T>(setter: (value: T) => void, value: T) => {
    validation.invalidate();
    setter(value);
  };
  const setPattern = (value: string) => {
    validation.invalidate();
    changePattern(value);
    changeCaptureText(captureNames(engine, value).join(', '));
  };
  const setEngine = (value: 'regex' | 'grok') => {
    validation.invalidate();
    changeEngine(value);
    changeCaptureText(captureNames(value, pattern).join(', '));
  };
  const generate = useGeneratedExtraction({
    params,
    engine,
    sample,
    source,
    validation,
    changePattern,
    changeCaptureText
  });
  const multilineGrok = engine === 'grok' && /[\r\n]/u.test(sample);
  return {
    engine,
    source,
    pattern,
    sample,
    candidate,
    ...validation,
    setEngine,
    setSource: (value: string) => change(changeSource, value),
    setPattern,
    setSample: (value: string) => change(changeSample, value),
    canGenerate: Boolean(sample.trim()) && !multilineGrok,
    multilineGrok,
    capturePatternMissing,
    generate
  };
}

function initialExtraction(params: Params) {
  const field = parseLogCalculatedV2(params.raw)?.fields.find(candidate => candidate.id === params.editingId);
  return field?.kind === 'extraction' ? field : undefined;
}

function useGeneratedExtraction(args: {
  params: Params;
  engine: 'regex' | 'grok';
  sample: string;
  source: string;
  validation: ReturnType<typeof useExtractionValidation>;
  changePattern: (pattern: string) => void;
  changeCaptureText: (names: string) => void;
}) {
  return () => {
    const generated = generateExtraction(args.engine, args.sample, args.source);
    if (!generated) return;
    const candidate = extractionCandidate(args.params, args.engine, args.source, generated.pattern, [generated.name]);
    args.validation.invalidate();
    args.changePattern(generated.pattern);
    args.changeCaptureText(generated.name);
    void args.validation.run(true, { candidate, sample: args.sample });
  };
}
