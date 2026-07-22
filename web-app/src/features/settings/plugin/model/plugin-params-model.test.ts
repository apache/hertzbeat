/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  buildPluginParamDraft,
  buildPluginParamPayload,
  decodeParamValue,
  encodeParamValue,
  invalidPluginParamFields,
  isPluginParamVisible,
  localizedPluginParamName,
  PluginParamCodecError
} from './plugin-params-model';

const defines = [
  {
    field: 'mode',
    type: 'radio',
    name: { 'en-US': 'Mode' },
    required: true,
    options: [{ label: 'TLS', value: 'tls' }],
    hide: false,
    depend: {}
  },
  {
    field: 'host',
    type: 'text',
    name: { 'en-US': 'Host' },
    required: true,
    options: [],
    hide: false,
    depend: { mode: ['tls'] }
  },
  {
    field: 'secret',
    type: 'password',
    name: { 'en-US': 'Secret' },
    required: true,
    options: [],
    hide: false,
    depend: {}
  }
] as const;

describe('plugin parameter model', () => {
  it('matches backend locale keys case-insensitively without language guessing', () => {
    expect(
      localizedPluginParamName({ ...defines[0], name: { 'en-US': 'Mode', 'zh-CN': 'Localized mode' } }, 'zh-cn')
    ).toBe('Localized mode');
  });
  it('derives dependency visibility and never places password values in the draft', () => {
    const draft = buildPluginParamDraft(7, defines, [
      { field: 'mode', type: 'radio', value: 'tls', configured: true },
      { field: 'secret', type: 'password', configured: true }
    ]);
    expect(isPluginParamVisible(defines[1], draft.values)).toBe(true);
    expect(draft.passwords.secret).toEqual({ intent: 'KEEP', value: '', canKeep: true });
    expect(JSON.stringify(draft)).not.toContain('private-secret');
  });

  it('round-trips structured string contracts and rejects malformed persistence', () => {
    const encoded = '{"Authorization":"Bearer"}';
    expect(encodeParamValue('key-value', decodeParamValue('key-value', encoded))).toBe(encoded);
    expect(() => decodeParamValue('metrics-field', '{bad')).toThrow(PluginParamCodecError);
    expect(() => decodeParamValue('boolean', 'yes')).toThrow(PluginParamCodecError);
    expect(encodeParamValue('array', decodeParamValue('array', 'alpha,beta'))).toBe('alpha,beta');
    expect(encodeParamValue('array', [' alpha ', 'beta'])).toBe('alpha,beta');
    expect(encodeParamValue('checkbox', decodeParamValue('checkbox', 'read,write'))).toBe('read,write');
    expect(
      encodeParamValue(
        'metrics-field',
        decodeParamValue('metrics-field', '[{"field":"cpu","unit":"%","type":0,"unknown":"drop"}]')
      )
    ).toBe('[{"field":"cpu","unit":"%","type":0}]');
  });

  it('builds explicit KEEP, REPLACE, and CLEAR password writes', () => {
    const draft = buildPluginParamDraft(7, defines, [{ field: 'secret', type: 'password', configured: true }]);
    expect(buildPluginParamPayload(draft).params.at(-1)).toEqual({ field: 'secret', intent: 'KEEP' });
    const replaced = {
      ...draft,
      passwords: { ...draft.passwords, secret: { intent: 'REPLACE' as const, value: 'new-secret', canKeep: true } }
    };
    expect(buildPluginParamPayload(replaced).params.at(-1)).toEqual({
      field: 'secret',
      intent: 'REPLACE',
      value: 'new-secret'
    });
    const cleared = {
      ...draft,
      passwords: { ...draft.passwords, secret: { intent: 'CLEAR' as const, value: '', canKeep: true } }
    };
    expect(buildPluginParamPayload(cleared).params.at(-1)).toEqual({ field: 'secret', intent: 'CLEAR' });
  });

  it('submits a dependency-hidden value without clearing it, matching the backend form contract', () => {
    const dependencyDefines = [
      { ...defines[0], options: [...defines[0].options, { label: 'Plain', value: 'plain' }] },
      defines[1],
      defines[2]
    ];
    const draft = buildPluginParamDraft(7, dependencyDefines, [
      { field: 'mode', type: 'radio', value: 'plain', configured: true },
      { field: 'host', type: 'text', value: 'kept.example', configured: true }
    ]);
    expect(isPluginParamVisible(dependencyDefines[1]!, draft.values)).toBe(false);
    expect(buildPluginParamPayload(draft).params).toContainEqual({ field: 'host', value: 'kept.example' });
  });

  it('canonicalizes checkbox wire case while preserving caller selection order', () => {
    const checkbox = {
      ...defines[0],
      field: 'regions',
      type: 'checkbox' as const,
      options: [
        { label: 'EU', value: 'eu' },
        { label: 'US', value: 'us' }
      ]
    };
    const draft = buildPluginParamDraft(
      7,
      [checkbox],
      [{ field: 'regions', type: 'checkbox', value: 'EU, us', configured: true }]
    );
    expect(buildPluginParamPayload(draft).params).toEqual([{ field: 'regions', value: 'eu,us' }]);
    expect(() =>
      buildPluginParamDraft(7, [checkbox], [{ field: 'regions', type: 'checkbox', value: 'EU,eu', configured: true }])
    ).toThrow(PluginParamCodecError);
  });

  it('validates required collections, ranges, option membership, and metric rows', () => {
    const draft = buildPluginParamDraft(
      7,
      [
        { ...defines[0], field: 'choice', type: 'checkbox', options: [{ label: 'Read', value: 'read' }] },
        { ...defines[0], field: 'port', type: 'number', range: '[1,10]', options: [] },
        { ...defines[0], field: 'headers', type: 'key-value', options: [] },
        { ...defines[0], field: 'metrics', type: 'metrics-field', options: [] }
      ],
      []
    );
    const invalid = {
      ...draft,
      values: { choice: ['unknown'], port: 11, headers: {}, metrics: [{ field: '', unit: '', type: 0 }] }
    };
    expect(invalidPluginParamFields(invalid)).toEqual(['choice', 'port', 'headers', 'metrics']);
  });

  it('rejects empty option writes, whitespace text, and lossy array items', () => {
    const draft = buildPluginParamDraft(
      7,
      [
        { ...defines[0], field: 'text', type: 'text', options: [] },
        { ...defines[0], field: 'radio', type: 'radio', options: [{ label: 'One', value: 'one' }] },
        { ...defines[0], field: 'tags', type: 'array', options: [] }
      ],
      []
    );
    expect(invalidPluginParamFields({ ...draft, values: { text: '   ', radio: '', tags: ['alpha,beta'] } })).toEqual([
      'text',
      'radio',
      'tags'
    ]);
    expect(() => decodeParamValue('array', 'a,,b')).toThrow(PluginParamCodecError);
  });

  it('allows optional choices to clear while validating every nonempty selection', () => {
    const radio = { ...defines[0], required: false };
    const checkbox = {
      ...defines[0],
      field: 'features',
      type: 'checkbox' as const,
      required: false,
      options: [
        { label: 'Read', value: 'read' },
        { label: 'Write', value: 'write' }
      ]
    };
    const draft = buildPluginParamDraft(7, [radio, checkbox], []);
    expect(invalidPluginParamFields({ ...draft, values: { mode: '', features: [] } })).toEqual([]);
    expect(invalidPluginParamFields({ ...draft, values: { mode: 'unknown', features: ['read', 'READ'] } })).toEqual([
      'mode',
      'features'
    ]);
  });
});
