/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useRef, useState } from 'react';
import {
  appendCalculatedExtraction,
  parseLogCalculatedV2,
  updateCalculatedExtraction
} from '../model/explore-log-calculated-v2';
import { validationError, validationPath } from '../model/explore-calculated-validation-issue';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';

type Params = {
  raw: string | undefined;
  editingId?: string | undefined;
  search?: string | undefined;
  sort?: string | undefined;
  analysis?: string | undefined;
  validate: ValidateCalculatedFields;
  onClose: () => void;
  onApply: (raw: string) => void;
};
type Preview = { definitionId: string; values: Record<string, string | number | boolean | null> };
type ValidationResult = Awaited<ReturnType<ValidateCalculatedFields>>;

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

function generateExtraction(engine: 'regex' | 'grok', sample: string, source: string) {
  if (!sample.trim()) return undefined;
  const multiline = /[\r\n]/u.test(sample);
  if (engine === 'grok' && multiline) return undefined;
  const name = captureName(source);
  let matcher: { grok: string; regex: string };
  if (/^[+-]?[0-9]+$/u.test(sample)) matcher = { grok: 'integer', regex: '[+-]?[0-9]+' };
  else if (/^[+-]?(?:[0-9]+\.[0-9]*|\.[0-9]+)$/u.test(sample)) {
    matcher = { grok: 'number', regex: '[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)' };
  } else if (/\s/u.test(sample)) matcher = { grok: 'data', regex: multiline ? '[\\s\\S]+' : '.+' };
  else matcher = { grok: 'notSpace', regex: '\\S+' };
  return {
    name,
    pattern: engine === 'grok' ? `^%{${matcher.grok}:${name}}$` : `^(?<${name}>${matcher.regex})$`
  };
}

function captureName(source: string) {
  const value = source === 'builtin:body' ? 'extracted_value' : source.slice(source.indexOf(':') + 1);
  const name = value.replace(/[^A-Za-z0-9_]/gu, '_');
  return /^[A-Za-z]/u.test(name) ? name.slice(0, 64) : `field_${name}`.slice(0, 64);
}

function captureNames(engine: 'regex' | 'grok', pattern: string) {
  return engine === 'grok' ? grokCaptureNames(pattern) : regexCaptureNames(pattern);
}

function grokCaptureNames(pattern: string) {
  const names: string[] = [];
  let position = 0;
  while (true) {
    const start = pattern.indexOf('%{', position);
    if (start < 0) return names;
    const end = pattern.indexOf('}', start + 2);
    if (end < 0) return [];
    const capture = pattern.slice(start + 2, end).split(':');
    const name = capture.length === 2 ? capture[1] : undefined;
    if (!name || !validCaptureName(name)) return [];
    names.push(name);
    position = end + 1;
  }
}

function regexCaptureNames(pattern: string) {
  const names: string[] = [];
  let inClass = false;
  for (let index = 0; index < pattern.length; index++) {
    const value = pattern[index];
    if (value === '\\') {
      index++;
    } else if (value === '[' && !inClass) {
      inClass = true;
    } else if (value === ']' && inClass) {
      inClass = false;
    } else if (!inClass && pattern.startsWith('(?<', index)) {
      const end = pattern.indexOf('>', index + 3);
      if (end < 0) return [];
      const name = pattern.slice(index + 3, end);
      if (!validCaptureName(name)) return [];
      names.push(name);
      index = end;
    }
  }
  return names;
}

function validCaptureName(name: string) {
  return /^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(name);
}

function extractionCandidate(
  params: Params,
  engine: 'regex' | 'grok',
  source: string,
  pattern: string,
  names: string[]
) {
  return params.editingId
    ? updateCalculatedExtraction(
        params.raw,
        params.editingId,
        engine,
        source,
        pattern,
        names,
        params.search,
        params.sort,
        params.analysis
      )
    : appendCalculatedExtraction(params.raw, engine, source, pattern, names);
}

function useExtractionValidation(params: Params, candidate: string | undefined, sample: string) {
  const [preview, setPreview] = useState<Preview>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [errorPath, setErrorPath] = useState<string>();
  const active = useRef<AbortController>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);
  const invalidate = () => {
    active.current?.abort();
    active.current = undefined;
    setPending(false);
    setPreview(undefined);
    setError(undefined);
    setErrorPath(undefined);
  };
  const cancel = () => {
    active.current?.abort();
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
    active.current = request;
    setPending(true);
    setError(undefined);
    try {
      const result = await params.validate(requestArgs.candidate, requestArgs.preview, request.signal);
      if (request.signal.aborted || !mounted.current) return;
      accept(result, sampleOnly, requestArgs.candidate);
    } catch {
      if (!request.signal.aborted && mounted.current) setError('unavailable');
    } finally {
      if (active.current === request) {
        active.current = undefined;
        if (mounted.current) setPending(false);
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
