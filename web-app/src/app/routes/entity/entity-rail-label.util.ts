const ENTITY_RAIL_DISPLAY_LABELS: Record<string, string> = {
  k8s_workload: 'K8s 负载'
};

export function getEntityRailDisplayLabel(value: string | undefined, label: string): string {
  if (value == null) {
    return label;
  }
  return ENTITY_RAIL_DISPLAY_LABELS[value] ?? label;
}
