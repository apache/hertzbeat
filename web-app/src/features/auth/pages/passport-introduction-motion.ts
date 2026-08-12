/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MAX_FONT_PX = 34;
const MIN_FONT_PX = 18;
const CURSOR_SPACE_PX = 14;

export const PASSPORT_INTRODUCTION_TYPE_MS = 45;
export const PASSPORT_INTRODUCTION_HOLD_MS = 1_750;
export const PASSPORT_INTRODUCTION_ROLL_MS = 460;

type TypewriterState = { phrase: number; visibleLength: number; phase: 'typing' | 'rolling' };

export function usePassportIntroductionMotion(phrases: readonly string[]) {
  const reducedMotion = useReducedMotion();
  const [typewriter, setTypewriter] = useState<TypewriterState>({ phrase: 0, visibleLength: 0, phase: 'typing' });
  const currentPhrase = phrases[typewriter.phrase] ?? phrases[0] ?? '';
  const glyphs = Array.from(currentPhrase);
  const visiblePhrase = reducedMotion ? currentPhrase : glyphs.slice(0, typewriter.visibleLength).join('');
  const stageRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const fittedFontSize = useFittedFontSize(stageRef, measureRef, currentPhrase);

  useEffect(() => {
    if (reducedMotion) return;
    const [delay, next] = nextTypewriterState(typewriter, glyphs.length, phrases.length);
    const timer = window.setTimeout(() => setTypewriter(next), delay);
    return () => window.clearTimeout(timer);
  }, [glyphs.length, phrases.length, reducedMotion, typewriter]);

  return { currentPhrase, fittedFontSize, measureRef, phase: typewriter.phase, reducedMotion, stageRef, visiblePhrase };
}

function nextTypewriterState(
  state: TypewriterState,
  glyphCount: number,
  phraseCount: number
): [number, TypewriterState] {
  if (state.phase === 'typing' && state.visibleLength < glyphCount) {
    return [PASSPORT_INTRODUCTION_TYPE_MS, { ...state, visibleLength: state.visibleLength + 1 }];
  }
  if (state.phase === 'typing') return [PASSPORT_INTRODUCTION_HOLD_MS, { ...state, phase: 'rolling' }];
  return [
    PASSPORT_INTRODUCTION_ROLL_MS,
    { phrase: (state.phrase + 1) % phraseCount, visibleLength: 0, phase: 'typing' }
  ];
}

function useFittedFontSize(
  stageRef: RefObject<HTMLElement | null>,
  measureRef: RefObject<HTMLElement | null>,
  phrase: string
) {
  const [fontSize, setFontSize] = useState(MAX_FONT_PX);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const measure = measureRef.current;
    if (!stage || !measure) return;
    const fit = () => setFontSize(current => fittedFontSize(stage, measure, current));
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [measureRef, phrase, stageRef]);
  return fontSize;
}

function fittedFontSize(stage: HTMLElement, measure: HTMLElement, current: number) {
  const available = stage.clientWidth - CURSOR_SPACE_PX;
  const required = measure.scrollWidth;
  if (available <= 0 || required <= 0) return current;
  return Math.max(MIN_FONT_PX, Math.min(MAX_FONT_PX, Math.floor(MAX_FONT_PX * (available / required))));
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => readReducedMotion());
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reducedMotion;
}

function readReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
