/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { SetupErrorCode, SetupWarningCode } from './setup-contract';

export const MAIL_SECURITY_MODES = ['none', 'starttls', 'tls'] as const;

type MailSecurity = (typeof MAIL_SECURITY_MODES)[number];
type SetupPublicAccess = {
  publicBaseUrl?: string;
  serverOtlpHttpEndpoint?: string;
  serverOtlpGrpcEndpoint?: string;
};
type SetupMail = {
  host: string;
  port: number;
  security: MailSecurity;
  username?: string;
  password?: string;
  fromAddress: string;
};
export type SetupOptionalDraft = {
  useProxy: boolean;
  proxyPublicBaseUrl: string;
  retentionDays: number | null;
  mail: {
    host: string;
    port: number | null;
    security: MailSecurity;
    username: string;
    password: string;
    fromAddress: string;
  };
};
export type SetupOptionsRequest = {
  publicAccess?: SetupPublicAccess;
  retention?: { days: number };
  mail?: SetupMail;
};
export type SetupOptionalValidationRequest =
  { section: 'public_access'; publicAccess: SetupPublicAccess } | { section: 'mail'; mail: SetupMail };
export type SetupOptionsResponse = Required<{
  publicBaseUrlConfigured: boolean;
  serverOtlpHttpConfigured: boolean;
  serverOtlpGrpcConfigured: boolean;
  retentionConfigured: boolean;
  mailConfigured: boolean;
}> & { phase: 'optional_configuration' };
export type SetupCompleteRequest = {
  expectedPhase: 'optional_configuration';
  acknowledgedWarnings: SetupWarningCode[];
};
export type SetupCompleteResponse = {
  phase: 'complete';
  completedAt: string;
  loginPath: string;
  username: string;
};
export type SetupOptionalValidationEvidence =
  | { state: 'checking' }
  | { state: 'complete'; valid: boolean; errorCode: SetupErrorCode | null; warnings: SetupWarningCode[] }
  | { state: 'failed'; failure: 'unavailable' | 'contract' | 'error'; errorCode: SetupErrorCode | null }
  | null;

export function createOptionalDraft(): SetupOptionalDraft {
  return {
    useProxy: false,
    proxyPublicBaseUrl: '',
    retentionDays: null,
    mail: { host: '', port: null, security: 'starttls', username: '', password: '', fromAddress: '' }
  };
}

export function createOptionalOptionsRequest(draft: SetupOptionalDraft, publicOrigin: string): SetupOptionsRequest {
  const request: SetupOptionsRequest = { publicAccess: normalizedPublicAccess(draft, publicOrigin) };
  if (draft.retentionDays !== null) request.retention = { days: draft.retentionDays };
  if (optionalMailStarted(draft.mail)) request.mail = normalizedMail(draft.mail);
  return request;
}

export function createOptionalValidationRequest(
  section: SetupOptionalValidationRequest['section'],
  draft: SetupOptionalDraft,
  publicOrigin: string
): SetupOptionalValidationRequest {
  if (section === 'public_access') return { section, publicAccess: normalizedPublicAccess(draft, publicOrigin) };
  return { section, mail: normalizedMail(draft.mail) };
}

function optionalMailStarted(mail: SetupOptionalDraft['mail']) {
  return Boolean(mail.host.trim() || mail.port || mail.username.trim() || mail.password || mail.fromAddress.trim());
}

export function optionalMailComplete(mail: SetupOptionalDraft['mail']) {
  if (!optionalMailStarted(mail)) return true;
  const credentialsMatch = Boolean(mail.username.trim()) === Boolean(mail.password.trim());
  return Boolean(mail.host.trim() && mail.port && mail.fromAddress.trim() && credentialsMatch);
}

export function optionalMailValidationReady(mail: SetupOptionalDraft['mail']) {
  return optionalMailStarted(mail) && optionalMailComplete(mail);
}

export function optionalDraftValid(draft: SetupOptionalDraft) {
  const retentionValid =
    draft.retentionDays === null || (Number.isInteger(draft.retentionDays) && draft.retentionDays > 0);
  return retentionValid && setupPublicAccessValid(draft) && optionalMailComplete(draft.mail);
}

export function clearOptionalMailSecret(draft: SetupOptionalDraft): SetupOptionalDraft {
  return { ...draft, mail: { ...draft.mail, password: '' } };
}

function normalizedPublicAccess(draft: SetupOptionalDraft, publicOrigin: string): SetupPublicAccess {
  const candidate = draft.useProxy ? draft.proxyPublicBaseUrl : publicOrigin;
  const publicBaseUrl = normalizeSetupPublicBaseUrl(candidate);
  if (!publicBaseUrl) throw new Error('Invalid setup public base URL');
  return { publicBaseUrl };
}

export function setupPublicAccessValid(draft: SetupOptionalDraft) {
  return !draft.useProxy || normalizeSetupPublicBaseUrl(draft.proxyPublicBaseUrl) !== null;
}

export function setupPublicAccessValidationReady(draft: SetupOptionalDraft) {
  return setupPublicAccessValid(draft);
}

function normalizeSetupPublicBaseUrl(value: string) {
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    const address = new URL(candidate);
    if (
      (address.protocol !== 'http:' && address.protocol !== 'https:') ||
      !address.hostname ||
      address.username ||
      address.password ||
      address.search ||
      address.hash ||
      address.port === '0' ||
      wildcardHost(address.hostname)
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

function wildcardHost(value: string) {
  const host = value.toLowerCase().replace(/^\[|\]$/g, '');
  return host === '0.0.0.0' || host === '::' || host === '0:0:0:0:0:0:0:0';
}

function normalizedMail(mail: SetupOptionalDraft['mail']): SetupMail {
  if (!optionalMailComplete(mail) || !optionalMailStarted(mail) || mail.port === null) {
    throw new Error('Incomplete optional mail configuration');
  }
  return {
    host: mail.host.trim(),
    port: mail.port,
    security: mail.security,
    ...(mail.username.trim() ? { username: mail.username.trim() } : {}),
    ...(mail.password.trim() ? { password: mail.password } : {}),
    fromAddress: mail.fromAddress.trim()
  };
}
