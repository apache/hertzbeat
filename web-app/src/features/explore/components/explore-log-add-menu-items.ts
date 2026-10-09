/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { LogAnalysisState } from '@/platform/perses';
import { parseLogCalculatedV2 } from '../model/explore-log-calculated-v2';

type Comparison = NonNullable<LogAnalysisState['comparison']>;
export function addMenuItems(
  t: TFunction,
  querySet: LogAnalysisState['querySet'],
  comparison: Comparison | undefined,
  migrationBlocked: boolean,
  calculatedRaw: string | undefined,
  calculatedAvailable: boolean,
  subqueryAvailable = false,
  subquerySyntax = 'structured-v1'
) {
  return [
    {
      key: 'query',
      label: t('explore.logComparison.add'),
      disabled: queryDisabled(querySet, migrationBlocked, calculatedRaw)
    },
    {
      key: 'formula',
      label: t('explore.logComparison.addFormula'),
      disabled: formulaDisabled(querySet, migrationBlocked, calculatedRaw)
    },
    {
      key: 'calculated',
      label: t('explore.logCalculated.mode'),
      disabled: calculatedDisabled(querySet, comparison, calculatedRaw, calculatedAvailable)
    },
    {
      key: 'subquery',
      label:
        subquerySyntax === 'structured-v1' ? t('explore.logSubquery.add') : t('explore.logSubquery.requiresStructured'),
      disabled: !subqueryAvailable
    }
  ];
}

function queryDisabled(querySet: LogAnalysisState['querySet'], migrationBlocked: boolean, raw: string | undefined) {
  return migrationBlocked || raw !== undefined || querySet?.queries.length === 4 || querySet?.nextSourceOrdinal === 26;
}

function formulaDisabled(querySet: LogAnalysisState['querySet'], migrationBlocked: boolean, raw: string | undefined) {
  return migrationBlocked || raw !== undefined || querySet?.formulas.length === 4 || querySet?.nextFormulaSeq === 10000;
}

export function calculatedDisabled(
  querySet: LogAnalysisState['querySet'],
  comparison: Comparison | undefined,
  raw: string | undefined,
  available: boolean
) {
  const state = parseLogCalculatedV2(raw);
  return (
    !available || Boolean(querySet || comparison) || (state?.fields.length ?? 0) >= 8 || state?.nextFieldSeq === 10000
  );
}
