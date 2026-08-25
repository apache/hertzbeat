/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { describe, expect, it } from 'vitest';

import publicStatusCss from './public-status.module.css?raw';

function ruleBody(selector: RegExp) {
  const body = publicStatusCss.match(selector)?.groups?.body;
  expect(body).toBeDefined();
  return body ?? '';
}

describe('public status visual tokens', () => {
  it('centralizes raw colors in named public-status custom properties', () => {
    expect(publicStatusCss).toContain('--status-surface:');
    expect(publicStatusCss).toContain('--status-state-healthy:');
    expect(publicStatusCss).toContain('--status-state-incident:');
    expect(publicStatusCss).toContain('--status-state-unknown:');

    const withoutTokenDeclarations = publicStatusCss.replace(/--status-[^;]+;/g, '');
    expect(withoutTokenDeclarations).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
  });

  it('uses one compact vertical rhythm for the public header and evidence sections', () => {
    expect(publicStatusCss).toContain('--status-header-gap: 24px;');
    expect(publicStatusCss).toContain('--status-section-gap: 26px;');
    expect(publicStatusCss).toMatch(/\.header\s*{[^}]*margin-bottom:\s*var\(--status-header-gap\)/s);
    expect(publicStatusCss).toMatch(/\.section\s*{[^}]*margin-top:\s*var\(--status-section-gap\)/s);
  });

  it('presents expanded incidents as a flat event stream instead of a nested card', () => {
    const list = ruleBody(/\.incidentList\s*\{(?<body>[^}]*)\}/);
    const summary = ruleBody(/\.incident summary\s*\{(?<body>[^}]*)\}/);
    const evidence = ruleBody(/\.incidentEvidence\s*\{(?<body>[^}]*)\}/);

    expect(list).toMatch(/border-inline:\s*0/);
    expect(list).toMatch(/border-radius:\s*0/);
    expect(list).toMatch(/background:\s*transparent/);
    expect(summary).toMatch(/padding:\s*16px;/);
    expect(evidence).toMatch(/padding:\s*2px 16px 22px 32px/);
    expect(evidence).toMatch(/border-top:\s*0/);
    expect(evidence).toMatch(/background:\s*transparent/);
    expect(publicStatusCss).toMatch(
      /\.incident\[data-incident-state='resolved'\] summary :global\(\.ant-tag\)[^{]*\{[^}]*color:\s*var\(--status-state-healthy\)/s
    );
  });
});
