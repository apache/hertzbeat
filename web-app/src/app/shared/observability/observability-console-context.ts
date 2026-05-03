export interface ObservabilityConsoleContext {
  entityId?: string | null;
  entityName?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  environment?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  start?: number | null;
  end?: number | null;
  returnTo?: string | null;
  returnLabel?: string | null;
}

export interface ObservabilityContextChip {
  label: string;
  value: string;
}

export interface ObservabilityContextLabels {
  object: string;
  service: string;
  namespace: string;
  environment: string;
}

export interface ObservabilityScopeCopy {
  service: string;
  object: string;
  empty: string;
}

function normalizeValue(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function replaceTemplate(template: string, values: Record<string, string | undefined>): string {
  return Object.entries(values).reduce((acc, [key, value]) => acc.replace(`{{${key}}}`, value ?? ''), template);
}

export function normalizeObservabilityConsoleContext(
  context: ObservabilityConsoleContext
): ObservabilityConsoleContext {
  return {
    entityId: normalizeValue(context.entityId),
    entityName: normalizeValue(context.entityName),
    serviceName: normalizeValue(context.serviceName),
    serviceNamespace: normalizeValue(context.serviceNamespace),
    environment: normalizeValue(context.environment),
    resourceType: normalizeValue(context.resourceType),
    resourceId: normalizeValue(context.resourceId),
    start: context.start,
    end: context.end,
    returnTo: normalizeValue(context.returnTo),
    returnLabel: normalizeValue(context.returnLabel)
  };
}

export function hasObservabilityConsoleContext(context: ObservabilityConsoleContext): boolean {
  const normalized = normalizeObservabilityConsoleContext(context);
  return [
    normalized.entityId,
    normalized.entityName,
    normalized.serviceName,
    normalized.serviceNamespace,
    normalized.environment,
    normalized.resourceId
  ].some(item => item != null);
}

export function getObservabilitySubjectLabel(context: ObservabilityConsoleContext, fallback: string): string {
  const normalized = normalizeObservabilityConsoleContext(context);
  return (
    normalized.entityName ||
    normalized.returnLabel ||
    normalized.entityId ||
    normalized.resourceId ||
    normalized.serviceName ||
    fallback
  );
}

export function buildObservabilityScopeCopy(
  context: ObservabilityConsoleContext,
  copy: ObservabilityScopeCopy,
  fallback: string
): string {
  const normalized = normalizeObservabilityConsoleContext(context);
  const subject = getObservabilitySubjectLabel(normalized, fallback);
  if (normalized.serviceName) {
    return replaceTemplate(copy.service, {
      object: subject,
      service: normalized.serviceName
    });
  }
  if (hasObservabilityConsoleContext(normalized)) {
    return replaceTemplate(copy.object, {
      object: subject
    });
  }
  return copy.empty;
}

export function buildObservabilityContextChips(
  context: ObservabilityConsoleContext,
  labels: ObservabilityContextLabels,
  fallback: string
): ObservabilityContextChip[] {
  const normalized = normalizeObservabilityConsoleContext(context);
  if (!hasObservabilityConsoleContext(normalized)) {
    return [];
  }
  const chips: ObservabilityContextChip[] = [
    {
      label: labels.object,
      value: getObservabilitySubjectLabel(normalized, fallback)
    }
  ];
  if (normalized.serviceName) {
    chips.push({
      label: labels.service,
      value: normalized.serviceName
    });
  }
  if (normalized.serviceNamespace) {
    chips.push({
      label: labels.namespace,
      value: normalized.serviceNamespace
    });
  }
  if (normalized.environment) {
    chips.push({
      label: labels.environment,
      value: normalized.environment
    });
  }
  return chips;
}
