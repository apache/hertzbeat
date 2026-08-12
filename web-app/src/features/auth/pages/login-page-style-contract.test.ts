/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import stylesheet from './login-page.module.css?raw';

describe('login page visual contract', () => {
  it('uses the original artwork on desktop and preserves its light-theme treatment', () => {
    expect(stylesheet).toContain("url('/assets/bg.png')");
    expect(stylesheet).toMatch(/@media \(min-width: 960px\)[\s\S]*\.page\s*{[^}]*background-image:\s*url/s);
    expect(stylesheet).not.toContain(":root[data-theme='default']");
    expect(stylesheet).toMatch(/@media \(min-width: 960px\)/);
  });

  it('keeps the form narrow, the explanation desktop-only, and the passport route responsive', () => {
    expect(stylesheet).toMatch(/\.formRegion\s*{[^}]*width:\s*min\(368px, 100%\)/s);
    expect(stylesheet).toMatch(/\.introductionBrand\s*{[^}]*width:\s*280px/s);
    expect(stylesheet).toMatch(/@media \(min-width: 960px\)[\s\S]*\.brandHeader\s*{[^}]*display:\s*none/s);
    expect(stylesheet).toMatch(/@media \(max-width: 959px\)[\s\S]*\.introduction\s*{[^}]*display:\s*none/s);
    expect(stylesheet).toMatch(/body:has\(\[data-passport-page='true'\]\)[^}]*min-width:\s*0/s);
  });

  it('keeps each capability on one fitted line and rolls the completed line before typing the next', () => {
    expect(stylesheet).toMatch(/\.introductionPositioning\s*{[^}]*margin-bottom:\s*clamp\(26px,\s*2\.5vw,\s*32px\)/s);
    expect(stylesheet).toMatch(/\.introductionPhraseStage\s*{[^}]*block-size:\s*1\.45em/s);
    expect(stylesheet).toMatch(/\.introductionTypingLine\s*{[^}]*white-space:\s*nowrap/s);
    expect(stylesheet).toContain('@keyframes passportIntroductionRollOut');
    expect(stylesheet).toContain('@keyframes passportIntroductionRollIn');
    expect(stylesheet).toMatch(/@keyframes passportIntroductionRollOut[\s\S]*translateY\(-115%\)/s);
    expect(stylesheet).toMatch(/@keyframes passportIntroductionRollIn[\s\S]*translateY\(115%\)/s);
    expect(stylesheet).toContain('@keyframes passportIntroductionCursor');
    expect(stylesheet).toMatch(/\.introductionMeasure\s*{[^}]*white-space:\s*nowrap/s);
    expect(stylesheet).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.introductionCursor[^}]*animation:\s*none/s
    );
  });

  it('uses a translucent glass login panel without a secondary introduction paragraph', () => {
    expect(stylesheet).not.toContain('.introductionDescription');
    expect(stylesheet).toMatch(
      /@media \(min-width: 960px\)[\s\S]*\.panel\s*{[^}]*background:\s*color-mix\(in srgb, var\(--hb-bg-raised\) 58%, transparent\)/s
    );
    expect(stylesheet).toMatch(/\.panel\s*{[^}]*backdrop-filter:\s*blur\(18px\) saturate\(1\.15\)/s);
  });
});
