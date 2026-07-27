/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNoticeActionCapabilities } from '../../controller/use-notice-action-capabilities';
import { noticeRuleCapabilitiesFromNoticePolicy } from '../model/notice-rule-action-capability';

export function useNoticeRuleActionCapabilities() {
  return noticeRuleCapabilitiesFromNoticePolicy(useNoticeActionCapabilities());
}
