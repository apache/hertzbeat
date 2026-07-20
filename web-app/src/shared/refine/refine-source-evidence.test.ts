/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { createRefineHttpError } from './refine-http-error';
import { isDefiniteRefineWriteRejection, isRefineSourceUnavailable } from './refine-source-evidence';

describe('Refine source evidence', () => {
  it.each([
    ['network', createRefineHttpError('private', 0, undefined, 'network'), true],
    ['missing HTTP status', createRefineHttpError('private', 500, undefined, 'http'), true],
    ['source status zero', createRefineHttpError('private', 500, undefined, 'http', 0), true],
    ['HTTP 5xx', createRefineHttpError('private', 503, undefined, 'http', 503), true],
    ['HTTP 408', createRefineHttpError('private', 408, undefined, 'http', 408), false],
    ['HTTP 4xx', createRefineHttpError('private', 422, undefined, 'http', 422), false],
    ['display status only', createRefineHttpError('private', 503, undefined, 'contract'), false],
    ['business envelope', createRefineHttpError('private', 400, 20, 'envelope', 200), false],
    ['contract source status', createRefineHttpError('private', 422, 'INVALID', 'contract', 422), false]
  ])('classifies unavailable source evidence for %s', (_label, reason, expected) => {
    expect(isRefineSourceUnavailable(reason)).toBe(expected);
  });

  it.each([
    ['HTTP 4xx', createRefineHttpError('private', 422, undefined, 'http', 422), true],
    ['HTTP 408', createRefineHttpError('private', 408, undefined, 'http', 408), false],
    ['missing HTTP status', createRefineHttpError('private', 422, undefined, 'http'), false],
    ['source status zero', createRefineHttpError('private', 422, undefined, 'http', 0), false],
    ['HTTP 5xx', createRefineHttpError('private', 503, undefined, 'http', 503), false],
    ['network', createRefineHttpError('private', 0, undefined, 'network'), false],
    ['display status only', createRefineHttpError('private', 422, undefined, 'contract'), false],
    ['business envelope', createRefineHttpError('private', 400, 20, 'envelope', 200), false],
    ['contract source status', createRefineHttpError('private', 422, 'INVALID', 'contract', 422), false]
  ])('classifies definite write rejection for %s', (_label, reason, expected) => {
    expect(isDefiniteRefineWriteRejection(reason)).toBe(expected);
  });

  it('does not trust cause-bearing HTTP 4xx as source-only evidence', () => {
    const reason = Object.assign(createRefineHttpError('private', 422, undefined, 'http', 422), {
      cause: new Error('private transport cause')
    });

    expect(isRefineSourceUnavailable(reason)).toBe(true);
    expect(isDefiniteRefineWriteRejection(reason)).toBe(false);
  });
});
