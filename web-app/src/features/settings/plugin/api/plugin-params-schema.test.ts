/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  parsePluginParamDefinition,
  parsePluginParamWritePayload,
  parsePluginParamWriteReceipt
} from './plugin-param-schema';
import { PluginContractError } from './plugin-contract-error';

describe('plugin parameter schema', () => {
  it('parses the frozen definition contract and rejects password material', () => {
    const wire = {
      paramDefines: [
        {
          field: 'secret',
          type: 'password',
          name: { 'en-US': 'Secret' },
          required: true,
          options: [],
          hide: false,
          depend: {}
        }
      ],
      pluginParams: [{ field: 'secret', type: 'password', configured: true }]
    };
    expect(parsePluginParamDefinition(wire).pluginParams[0]).not.toHaveProperty('value');
    expect(() =>
      parsePluginParamDefinition({ ...wire, pluginParams: [{ ...wire.pluginParams[0], value: 'leak' }] })
    ).toThrow(PluginContractError);
    expect(() =>
      parsePluginParamDefinition({ ...wire, paramDefines: [{ ...wire.paramDefines[0], placeholder: 'leak' }] })
    ).toThrow(PluginContractError);
  });

  it('rejects duplicate, unknown, unsupported, and mismatched definition identity', () => {
    const data = {
      paramDefines: [
        {
          field: 'secret',
          type: 'password',
          name: { 'en-US': 'Secret' },
          required: true,
          options: [],
          hide: false,
          depend: {}
        }
      ],
      pluginParams: [{ field: 'secret', type: 'password', configured: true }]
    };
    expect(() =>
      parsePluginParamDefinition({ ...data, paramDefines: [...data.paramDefines, data.paramDefines[0]] })
    ).toThrow(PluginContractError);
    expect(() =>
      parsePluginParamDefinition({ ...data, pluginParams: [...data.pluginParams, data.pluginParams[0]] })
    ).toThrow(PluginContractError);
    expect(() =>
      parsePluginParamDefinition({ ...data, paramDefines: [{ ...data.paramDefines[0], type: 'json' }] })
    ).toThrow(PluginContractError);
    expect(() =>
      parsePluginParamDefinition({ ...data, pluginParams: [{ field: 'unknown', type: 'text', configured: false }] })
    ).toThrow(PluginContractError);
    expect(() =>
      parsePluginParamDefinition({ ...data, pluginParams: [{ field: 'secret', type: 'text', configured: true }] })
    ).toThrow(PluginContractError);
    expect(() => parsePluginParamDefinition({ ...data, pluginParams: [] })).toThrow(PluginContractError);
  });

  it('rejects blank, untrimmed, and case-insensitively duplicate choice options', () => {
    const choice = {
      field: 'mode',
      type: 'radio',
      name: {},
      required: true,
      options: [{ label: 'One', value: 'one' }],
      hide: false,
      depend: {}
    };
    const parse = (options: { label: string; value: string }[]) =>
      parsePluginParamDefinition({
        paramDefines: [{ ...choice, options }],
        pluginParams: [{ field: 'mode', type: 'radio', configured: false }]
      });
    expect(() => parse([{ label: ' ', value: 'one' }])).toThrow(PluginContractError);
    expect(() => parse([])).toThrow(PluginContractError);
    expect(() => parse([{ label: 'One', value: ' one ' }])).toThrow(PluginContractError);
    expect(() =>
      parse([
        { label: 'One', value: 'one' },
        { label: 'Duplicate', value: 'ONE' }
      ])
    ).toThrow(PluginContractError);
    expect(() =>
      parsePluginParamDefinition({
        paramDefines: [{ ...choice, type: 'checkbox', options: [{ label: 'Split', value: 'one,two' }] }],
        pluginParams: [{ field: 'mode', type: 'checkbox', configured: false }]
      })
    ).toThrow(PluginContractError);
  });

  it('requires ordinary configured state to correlate with a nonblank value', () => {
    const define = { field: 'host', type: 'host', required: false, hide: false };
    const parse = (param: { field: string; type: string; configured: boolean; value?: string }) =>
      parsePluginParamDefinition({ paramDefines: [define], pluginParams: [param] });
    expect(() => parse({ field: 'host', type: 'host', configured: true })).toThrow(PluginContractError);
    expect(() => parse({ field: 'host', type: 'host', configured: true, value: '   ' })).toThrow(PluginContractError);
    expect(() => parse({ field: 'host', type: 'host', configured: false, value: 'stored' })).toThrow(
      PluginContractError
    );
    expect(parse({ field: 'host', type: 'host', configured: true, value: 'localhost' }).pluginParams[0]).toEqual({
      field: 'host',
      type: 'host',
      configured: true,
      value: 'localhost'
    });
  });

  it('accepts only a true write receipt', () => {
    expect(parsePluginParamWriteReceipt(true)).toBe(true);
    expect(() => parsePluginParamWriteReceipt(false)).toThrow(PluginContractError);
  });

  it('enforces exact password write intent shapes', () => {
    expect(
      parsePluginParamWritePayload({
        pluginMetadataId: 7,
        params: [
          { field: 'secret', intent: 'KEEP' },
          { field: 'other', intent: 'REPLACE', value: 'new' }
        ]
      })
    ).toBeTruthy();
    expect(() =>
      parsePluginParamWritePayload({
        pluginMetadataId: 7,
        params: [{ field: 'secret', intent: 'KEEP', value: 'leak' }]
      })
    ).toThrow(PluginContractError);
    expect(() =>
      parsePluginParamWritePayload({ pluginMetadataId: 7, params: [{ field: 'secret', intent: 'REPLACE' }] })
    ).toThrow(PluginContractError);
    expect(
      parsePluginParamWritePayload({
        pluginMetadataId: 7,
        params: [{ field: 'secret', intent: 'REPLACE', value: ' secret ' }]
      }).params[0]
    ).toMatchObject({ value: ' secret ' });
    expect(() =>
      parsePluginParamWritePayload({
        pluginMetadataId: 7,
        params: [{ field: 'secret', intent: 'REPLACE', value: '   ' }]
      })
    ).toThrow(PluginContractError);
  });

  it('normalizes backend-omitted nullable definition collections', () => {
    expect(
      parsePluginParamDefinition({
        paramDefines: [{ field: 'secret', type: 'password', required: true, hide: false }],
        pluginParams: [{ field: 'secret', type: 'password', configured: false }]
      }).paramDefines[0]
    ).toMatchObject({ name: {}, options: [], depend: {} });
  });

  it('accepts boolean and number dependency values', () => {
    const parsed = parsePluginParamDefinition({
      paramDefines: [
        { field: 'enabled', type: 'boolean', required: false, hide: false },
        { field: 'host', type: 'host', required: false, hide: false, depend: { enabled: [true], retries: [2] } }
      ],
      pluginParams: [
        { field: 'enabled', type: 'boolean', configured: false },
        { field: 'host', type: 'host', configured: false }
      ]
    });
    expect(parsed.paramDefines[1]?.depend).toEqual({ enabled: [true], retries: [2] });
  });
});
