/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export const pluginParamTypes = [
  'text',
  'textarea',
  'number',
  'password',
  'boolean',
  'radio',
  'checkbox',
  'array',
  'host',
  'key-value',
  'metrics-field'
] as const;
export type PluginParamType = (typeof pluginParamTypes)[number];
type PluginParamOption = { label: string; value: string };
export type PluginParamDefine = {
  app?: string;
  name: Record<string, string>;
  field: string;
  type: PluginParamType;
  required: boolean;
  defaultValue?: string;
  placeholder?: string;
  range?: string;
  limit?: number;
  options: readonly PluginParamOption[];
  keyAlias?: string;
  valueAlias?: string;
  hide: boolean;
  depend: Readonly<Record<string, readonly unknown[]>>;
};
export type PluginParam = { field: string; type: PluginParamType; value?: string; configured: boolean };
export type KeyValueDraftRow = { id: string; key: string; value: string };
export type MetricDraftRow = { id: string; field: string; unit: string; type: 0 | 1 };
export type PasswordDraft = { intent: 'KEEP' | 'REPLACE' | 'CLEAR'; value: string; canKeep: boolean };
export type PluginParamDraft = {
  pluginMetadataId: number;
  defines: readonly PluginParamDefine[];
  values: Record<string, unknown>;
  passwords: Record<string, PasswordDraft>;
};
export type PluginParamWrite =
  | { field: string; value: string }
  | { field: string; intent: 'KEEP' | 'CLEAR' }
  | { field: string; intent: 'REPLACE'; value: string };
