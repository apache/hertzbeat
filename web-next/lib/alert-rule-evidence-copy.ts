type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type AlertRuleEvidenceMode = 'group' | 'silence' | 'inhibit' | 'notice';
type AlertRuleEvidenceSignal = 'logs' | 'traces' | 'metrics' | undefined;

export function buildAlertRuleEvidenceSignalName(signal: AlertRuleEvidenceSignal, t: Translator) {
  return t(`alert.rule.signal.${signal || 'default'}`);
}

export function buildAlertRuleEvidenceFallbackTarget(t: Translator) {
  return t('alert.rule.evidence.fallback-target');
}

export function buildAlertRuleEvidenceTitle(mode: AlertRuleEvidenceMode, signal: AlertRuleEvidenceSignal, t: Translator) {
  return t(`alert.rule.evidence.${mode}.title`, {
    signal: buildAlertRuleEvidenceSignalName(signal, t)
  });
}

export function buildAlertRuleEvidenceCopy(mode: AlertRuleEvidenceMode, t: Translator) {
  return t(`alert.rule.evidence.${mode}.copy`);
}

export function buildAlertRuleEvidenceDraftName(
  mode: AlertRuleEvidenceMode,
  signal: AlertRuleEvidenceSignal,
  target: string,
  t: Translator
) {
  return t(`alert.rule.evidence.${mode}.draft-name`, {
    signal: buildAlertRuleEvidenceSignalName(signal, t),
    target
  });
}
