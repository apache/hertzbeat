import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readSettingDefineRouteState, readSettingDefineRouteStateFromSearch } from './query-state';

describe('setting define query state', () => {
  it('reads the old Angular monitor-template selected app query param', () => {
    expect(readSettingDefineRouteState({ app: 'mysql' })).toEqual({ app: 'mysql' });
    expect(readSettingDefineRouteState({ app: ['mysql', 'postgresql'] })).toEqual({ app: 'mysql' });
    expect(readSettingDefineRouteState({ app: '   ' })).toEqual({ app: null });
    expect(readSettingDefineRouteState()).toEqual({ app: null });
  });

  it('reads the selected app from browser URL search without alert-rule payloads', () => {
    expect(readSettingDefineRouteStateFromSearch('?app=mysql')).toEqual({ app: 'mysql' });
    expect(readSettingDefineRouteStateFromSearch('app=postgresql')).toEqual({ app: 'postgresql' });
    expect(readSettingDefineRouteStateFromSearch('?search=%5B%22cpu%22%5D')).toEqual({ app: null });
  });

  it('does not keep alert-rule define URL ownership in the monitor-template YML package', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/setting-define/query-state.ts'), 'utf8');

    expect(source).not.toContain('/alert/defines');
    expect(source).not.toContain('buildDefineListUrl');
    expect(source).not.toContain('normalizeDefineSearch');
  });
});
