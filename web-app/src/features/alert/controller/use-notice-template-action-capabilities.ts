/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { noticeTemplateCapabilitiesFromNoticePolicy } from '../model/notice-template-action-capability';
import { useNoticeActionCapabilities } from './use-notice-action-capabilities';

export function useNoticeTemplateActionCapabilities() {
  return noticeTemplateCapabilitiesFromNoticePolicy(useNoticeActionCapabilities());
}
