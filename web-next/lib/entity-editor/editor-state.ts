import { parseCommaSeparated, type KeyValueDraft } from './draft-utils';
import type { EntityLinkRef } from '@/lib/types';

export function ensureKeyValueRows(rows: KeyValueDraft[]) {
  return rows.length > 0 ? rows : [{ key: '', value: '' }];
}

export function updateRowAt(rows: KeyValueDraft[], index: number, patch: Partial<KeyValueDraft>) {
  return rows.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

export function removeRowAt(rows: KeyValueDraft[], index: number) {
  return rows.length === 1 ? [{ key: '', value: '' }] : rows.filter((_, itemIndex) => itemIndex !== index);
}

export function appendCommaSeparatedValue(text: string, value: string) {
  const current = parseCommaSeparated(text);
  if (current.includes(value)) return text;
  return [...current, value].join(', ');
}

export function seedFirstLinkProvider(links: EntityLinkRef[], provider: string) {
  const next = links.length > 0 ? [...links] : [{}];
  next[0] = { ...next[0], provider };
  return next;
}
