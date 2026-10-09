/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { TFunction } from 'i18next';

import type { HertzBeatPersesPrimitiveMessages } from '@/platform/perses';

type InvestigationMessageScope = {
  root: string;
  empty: string;
  unavailable: string;
};

const defaultScope: InvestigationMessageScope = {
  root: 'exploreInvestigation',
  empty: 'query.empty',
  unavailable: 'query.unavailable'
};

export function investigationPrimitiveMessages(
  t: TFunction,
  { root, empty, unavailable }: InvestigationMessageScope = defaultScope
): HertzBeatPersesPrimitiveMessages {
  const key = (suffix: string) => `${root}.${suffix}`;
  return {
    loading: t(key('query.loading')),
    empty: t(key(empty)),
    truncated: t(key('query.truncated')),
    truncationUnknown: t(key('query.truncationUnknown')),
    runtimeError: t(key('query.runtimeError')),
    failures: {
      'perses.query.invalid': t(key('query.invalid')),
      'perses.query.permission': t(key('query.permission')),
      'perses.query.overloaded': t(key('query.overloaded')),
      'perses.query.unavailable': t(key(unavailable)),
      'perses.query.contract': t(key('query.contract'))
    }
  };
}
