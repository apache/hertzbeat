import { describe, expect, it, vi } from 'vitest';
import { resolveWorkbenchError } from './client-workbench-state';
import { createTranslatorMock } from '../test/i18n-test-helper';

const t = createTranslatorMock({
  overrides: {
    'common.error.unknown': 'Unknown error'
  }
});

describe('resolveWorkbenchError', () => {
  it('redirects to login when the request looks unauthorized and token is missing', () => {
    expect(resolveWorkbenchError(new Error('401 unauthorized'), false, t)).toEqual({
      redirectToLogin: true,
      message: null
    });
  });

  it('redirects to login when the request looks unauthorized and token exists but is stale', () => {
    expect(resolveWorkbenchError(new Error('API request failed: 401'), true, t)).toEqual({
      redirectToLogin: true,
      message: null
    });
  });

  it('returns translated fallback for unknown errors', () => {
    expect(resolveWorkbenchError(null, true, t)).toEqual({
      redirectToLogin: false,
      message: 'Unknown error'
    });
  });

  it('returns the actual error message when available', () => {
    expect(resolveWorkbenchError(new Error('network down'), true, t)).toEqual({
      redirectToLogin: false,
      message: 'network down'
    });
  });
});
