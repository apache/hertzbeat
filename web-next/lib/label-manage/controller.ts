import type { Label, PageResult } from '@/lib/types';
import { buildLabelUrl, type LabelQueryState } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiWriter = <T>(url: string, payload: unknown) => Promise<T>;
type ApiDelete = <T>(url: string) => Promise<T>;

export async function loadLabelData(apiGet: ApiGetter, query: LabelQueryState) {
  const list = await apiGet<PageResult<Label>>(buildLabelUrl(query));
  return { list };
}

export type LabelManagePageData = Awaited<ReturnType<typeof loadLabelData>>;

export function createEmptyLabelDraft(): Label {
  return {
    id: 0,
    name: undefined as unknown as string,
    tagValue: undefined,
    description: undefined,
    type: undefined as unknown as number
  };
}

export function cloneLabelDraft(label: Label): Label {
  return {
    ...createEmptyLabelDraft(),
    ...label
  };
}

function normalizeLabelDraft(draft: Label): Label {
  return {
    ...draft,
    name: (draft.name ?? '').trim(),
    tagValue: draft.tagValue == undefined ? undefined : draft.tagValue.trim(),
    description: draft.description == undefined ? undefined : draft.description.trim(),
    type: draft.type
  };
}

export async function saveLabel(apiPost: ApiWriter, apiPut: ApiWriter, draft: Label, isAdd: boolean) {
  const payload = normalizeLabelDraft(draft);
  if (isAdd || !payload.id) {
    return apiPost('/label', payload);
  }
  return apiPut('/label', payload);
}

export async function deleteLabels(apiDelete: ApiDelete, labelIds: number[]) {
  const params = new URLSearchParams();
  labelIds.forEach(labelId => {
    params.append('ids', String(labelId));
  });
  return apiDelete(`/label?${params.toString()}`);
}

export async function deleteLabel(apiDelete: ApiDelete, labelId: number) {
  return deleteLabels(apiDelete, [labelId]);
}
