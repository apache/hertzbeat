/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  applyFileLogSource,
  cancelFileLogSource,
  managedFileLogLimits,
  removeFileLogSource,
  selectFileLogSource,
  type ManagedFileLogSourceDraft,
  type ManagedFileLogSourceView
} from './collector-file-log-source-model';

const first = source('first');
const second = source('second');

describe('collector FileLog source model', () => {
  it('replaces, appends, and removes exact sources without sorting', () => {
    const replaced = applyFileLogSource({ sources: [first, second], selection: 0 }, source('replacement'));
    const appended = applyFileLogSource({ sources: replaced?.sources ?? [], selection: 'new' }, source('third'));

    expect(appended?.sources.map(item => item.name)).toEqual(['replacement', 'second', 'third']);
    expect(removeFileLogSource({ sources: appended?.sources ?? [], selection: 1 }, 1)).toEqual({
      sources: [source('replacement'), source('third')],
      selection: null
    });
  });

  it('cancels a draft without changing sources and rejects invalid selections', () => {
    expect(cancelFileLogSource({ sources: [first], selection: 0 })).toEqual(view([first]));
    expect(selectFileLogSource(view([first]), 2)).toBeNull();
    expect(applyFileLogSource({ sources: [first], selection: 2 }, second)).toBeNull();
  });

  it('rejects adding once the 16-source maximum is reached', () => {
    const sources = Array.from({ length: managedFileLogLimits.sources }, (_, index) => source(`source-${index}`));

    expect(selectFileLogSource(view(sources), 'new')).toBeNull();
    expect(applyFileLogSource({ sources, selection: 'new' }, source('overflow'))).toBeNull();
  });
});

function view(sources: readonly ManagedFileLogSourceDraft[]): ManagedFileLogSourceView {
  return { sources, selection: null };
}

function source(name: string): ManagedFileLogSourceDraft {
  return { name, pathProfile: `${name}-profile` };
}
