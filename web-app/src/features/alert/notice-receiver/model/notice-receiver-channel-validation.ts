/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { NoticeReceiverDraft, NoticeReceiverSecretKey } from './notice-receiver-model';

type SecretAvailable = (draft: NoticeReceiverDraft, key: NoticeReceiverSecretKey) => boolean;

export function channelValidationErrors(draft: NoticeReceiverDraft, secretAvailable: SecretAvailable) {
  switch (draft.type) {
    case 1:
      return emailErrors(draft);
    case 4:
    case 5:
      return phoneErrors(draft);
    case 2:
      return webhookAuthErrors(draft, secretAvailable);
    case 10:
      return weComRecipientErrors(draft);
    default:
      return [];
  }
}

function emailErrors(draft: NoticeReceiverDraft) {
  return draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email) ? ['email'] : [];
}

function phoneErrors(draft: NoticeReceiverDraft) {
  return draft.phone && !/^(1\d{10})(,\s*1\d{10})*$/.test(draft.phone) ? ['phone'] : [];
}

function webhookAuthErrors(draft: NoticeReceiverDraft, secretAvailable: SecretAvailable) {
  return draft.hookAuthType !== 'None' && !secretAvailable(draft, 'hookAuthToken') ? ['hookAuthToken'] : [];
}

function weComRecipientErrors(draft: NoticeReceiverDraft) {
  return [draft.userId, draft.partyId, draft.tagId].some(value => value.trim()) ? [] : ['recipientTarget'];
}
