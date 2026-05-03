export type StreamSelectableItem<T> = {
  key: string;
  entry: T;
};

export function resolveStreamSelection<T>({
  items,
  selectedKey,
  persisted
}: {
  items: StreamSelectableItem<T>[];
  selectedKey: string | null;
  persisted: StreamSelectableItem<T> | null;
}) {
  if (selectedKey) {
    const visible = items.find(item => item.key === selectedKey);
    if (visible) {
      return { selected: visible, detached: false };
    }
    if (persisted?.key === selectedKey) {
      return { selected: persisted, detached: true };
    }
  }

  if (items[0]) {
    return { selected: items[0], detached: false };
  }

  return { selected: persisted, detached: Boolean(persisted) };
}
