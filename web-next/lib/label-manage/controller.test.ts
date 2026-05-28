import { describe, expect, it, vi } from 'vitest';
import { cloneLabelDraft, createEmptyLabelDraft, deleteLabel, deleteLabels, loadLabelData, saveLabel } from './controller';

describe('label manage controller', () => {
  it('loads labels through the shared query-state url', async () => {
    const apiMessageGet = vi.fn().mockResolvedValue({ content: [], totalElements: 0, pageIndex: 0, pageSize: 8 });

    const result = await loadLabelData(apiMessageGet as any, { search: 'team', type: '' });

    expect(apiMessageGet).toHaveBeenCalledWith('/label?pageIndex=0&pageSize=9999&search=team');
    expect(result).toEqual({
      list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 }
    });
  });

  it('creates and clones label drafts for the shared authoring dialog', () => {
    expect(createEmptyLabelDraft()).toEqual({
      id: 0,
      name: undefined,
      tagValue: undefined,
      description: undefined,
      type: undefined
    });
    expect(cloneLabelDraft({ id: 3, name: 'team', tagValue: 'ops', description: 'ops team', type: 1 } as any)).toEqual({
      id: 3,
      name: 'team',
      tagValue: 'ops',
      description: 'ops team',
      type: 1
    });
  });

  it('routes add/edit/delete requests through the expected label endpoints', async () => {
    const apiMessagePost = vi.fn().mockResolvedValue('created');
    const apiMessagePut = vi.fn().mockResolvedValue('updated');
    const apiMessageDelete = vi.fn().mockResolvedValue('deleted');

    await saveLabel(apiMessagePost as any, apiMessagePut as any, { id: 0, name: ' team ', tagValue: ' ops ', description: ' desc ' } as any, true);
    await saveLabel(apiMessagePost as any, apiMessagePut as any, { id: 7, name: ' team ', tagValue: ' ops ', description: ' desc ', type: 1 } as any, false);
    await deleteLabel(apiMessageDelete as any, 7);

    expect(apiMessagePost).toHaveBeenCalledWith('/label', {
      id: 0,
      name: 'team',
      tagValue: 'ops',
      description: 'desc',
      type: undefined
    });
    expect(apiMessagePut).toHaveBeenCalledWith('/label', {
      id: 7,
      name: 'team',
      tagValue: 'ops',
      description: 'desc',
      type: 1
    });
    expect(apiMessageDelete).toHaveBeenCalledWith('/label?ids=7');
  });

  it('preserves untouched optional label fields as undefined while trimming edited fields', async () => {
    const apiMessagePost = vi.fn().mockResolvedValue('created');
    const apiMessagePut = vi.fn().mockResolvedValue('updated');

    await saveLabel(apiMessagePost as any, apiMessagePut as any, { id: 0, name: ' team ', tagValue: undefined, description: undefined } as any, true);
    await saveLabel(apiMessagePost as any, apiMessagePut as any, { id: 8, name: ' team ', tagValue: '  ', description: '  note  ', type: 1 } as any, false);

    expect(apiMessagePost).toHaveBeenCalledWith('/label', {
      id: 0,
      name: 'team',
      tagValue: undefined,
      description: undefined,
      type: undefined
    });
    expect(apiMessagePut).toHaveBeenCalledWith('/label', {
      id: 8,
      name: 'team',
      tagValue: '',
      description: 'note',
      type: 1
    });
  });

  it('trims a whitespace-only name only when building the Angular save payload', async () => {
    const apiMessagePost = vi.fn().mockResolvedValue('created');
    const apiMessagePut = vi.fn().mockResolvedValue('updated');

    await saveLabel(apiMessagePost as any, apiMessagePut as any, { id: 0, name: '   ', tagValue: undefined, description: undefined } as any, true);

    expect(apiMessagePost).toHaveBeenCalledWith('/label', {
      id: 0,
      name: '',
      tagValue: undefined,
      description: undefined,
      type: undefined
    });
  });

  it('preserves Angular new-label implicit type while keeping loaded edit type', async () => {
    const apiMessagePost = vi.fn().mockResolvedValue('created');
    const apiMessagePut = vi.fn().mockResolvedValue('updated');

    await saveLabel(apiMessagePost as any, apiMessagePut as any, createEmptyLabelDraft(), true);
    await saveLabel(apiMessagePost as any, apiMessagePut as any, { id: 8, name: ' team ', type: 2 } as any, false);

    expect(apiMessagePost).toHaveBeenCalledWith('/label', {
      id: 0,
      name: '',
      tagValue: undefined,
      description: undefined,
      type: undefined
    });
    expect(apiMessagePut).toHaveBeenCalledWith('/label', {
      id: 8,
      name: 'team',
      tagValue: undefined,
      description: undefined,
      type: 2
    });
  });

  it('deletes labels with the Angular repeated ids query contract', async () => {
    const apiMessageDelete = vi.fn().mockResolvedValue('deleted');

    await deleteLabels(apiMessageDelete as any, [7, 8]);

    expect(apiMessageDelete).toHaveBeenCalledWith('/label?ids=7&ids=8');
  });
});
