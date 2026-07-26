/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { entityRoutePaths } from '@/shared/navigation/app-paths';

export type AlertNoiseControlRuleType = 'silence' | 'inhibit';
export type AlertNoiseControlManagementContext = {
  entityId: number;
  entityName: string;
  returnTo: string;
  returnLabel: string;
  mode: 'matched' | 'all';
  matchingRuleIds: number[];
};

// Management context is URL-owned, so bound both cardinality and display text before retaining it.
const maximumManagementRuleIds = 50;
const maximumManagementLabelLength = 120;

export function readAlertNoiseControlManagementContext(
  params: URLSearchParams,
  ruleType: AlertNoiseControlRuleType
): AlertNoiseControlManagementContext | null {
  const entityId = parsePositiveSafeId(params.get('entityId'));
  const mode = params.get('matchMode') === 'entity-noise-controls' ? 'matched' : params.get('matchMode');
  if (entityId === undefined || (mode !== 'matched' && mode !== 'all') || params.get('matchingRuleType') !== ruleType) {
    return null;
  }
  return {
    entityId,
    entityName: boundedText(params.get('entityName')),
    // Return ownership is derived from the validated entity id, never from an arbitrary URL parameter.
    returnTo: entityRoutePaths.detail.replace(':entityId', String(entityId)),
    returnLabel: boundedText(params.get('returnLabel')),
    mode,
    matchingRuleIds: parseMatchingRuleIds(params.get('matchingRuleIds'))
  };
}

export function writeAlertNoiseControlManagementContext(
  params: URLSearchParams,
  context: AlertNoiseControlManagementContext | null,
  ruleType: AlertNoiseControlRuleType
) {
  if (!context) return params;
  params.set('entityId', String(context.entityId));
  if (context.entityName) params.set('entityName', context.entityName);
  params.set('returnTo', entityRoutePaths.detail.replace(':entityId', String(context.entityId)));
  if (context.returnLabel) params.set('returnLabel', context.returnLabel);
  params.set('matchMode', context.mode === 'matched' ? 'entity-noise-controls' : 'all');
  params.set('matchingRuleType', ruleType);
  if (context.matchingRuleIds.length > 0) params.set('matchingRuleIds', context.matchingRuleIds.join(','));
  return params;
}

function parsePositiveSafeId(value: string | null) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseMatchingRuleIds(value: string | null) {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(',')
        .map(id => parsePositiveSafeId(id.trim()))
        .filter((id): id is number => id !== undefined)
    )
  ].slice(0, maximumManagementRuleIds);
}

function boundedText(value: string | null) {
  return value?.trim().slice(0, maximumManagementLabelLength) ?? '';
}
