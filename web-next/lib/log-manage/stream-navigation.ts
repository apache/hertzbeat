export type StreamNavigableItem = {
  key: string;
};

export function getStreamNeighborKeys({
  items,
  selectedKey
}: {
  items: StreamNavigableItem[];
  selectedKey: string | null;
}) {
  if (!selectedKey) {
    return {
      newerKey: null,
      olderKey: null
    };
  }

  const index = items.findIndex(item => item.key === selectedKey);
  if (index === -1) {
    return {
      newerKey: null,
      olderKey: null
    };
  }

  return {
    newerKey: items[index - 1]?.key ?? null,
    olderKey: items[index + 1]?.key ?? null
  };
}
