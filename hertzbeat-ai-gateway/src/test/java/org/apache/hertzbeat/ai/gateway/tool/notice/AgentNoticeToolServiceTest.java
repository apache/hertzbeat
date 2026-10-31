/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.ai.gateway.tool.notice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.validation.Validator;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.dto.NoticeReceiverOptions;
import org.apache.hertzbeat.alert.dto.NoticeReceiverResponse;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.alert.service.NoticeReceiverContractService;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.junit.jupiter.api.Test;

class AgentNoticeToolServiceTest {
    private final NoticeConfigService notices = mock(NoticeConfigService.class);
    private final NoticeReceiverContractService receivers = mock(NoticeReceiverContractService.class);
    private final Validator validator = mock(Validator.class);
    private final AgentNoticeToolService service = new AgentNoticeToolService(notices, receivers, validator, new AlerterProperties());

    @Test
    void createsOnlyCredentialFreeReceiverTypesAndDelegatesVerifiedDelete() {
        when(validator.validate(any())).thenReturn(Set.of());
        service.receiverCreate("ops", (byte) 1, "ops@example.test");
        verify(receivers).create(org.mockito.ArgumentMatchers.argThat(request ->
                request.getId() == null && "ops@example.test".equals(request.getOptions().getEmail())
                        && request.getOptions().getAccessToken() == null));
        assertThrows(IllegalArgumentException.class, () -> service.receiverCreate("ops", (byte) 7, "destination"));
        service.receiverDelete(2L);
        verify(receivers).delete(2L);
    }

    @Test
    void usesRedactedReceiverContractOnly() {
        var receiver = new NoticeReceiverResponse(1L, "ops", (byte) 0, "email", new NoticeReceiverOptions(),
                Set.of("accessToken"), null, null, null, null);
        when(receivers.get(1L)).thenReturn(receiver);
        assertEquals(receiver, service.receiverGet(1L));
        verify(notices, never()).getReceiverById(any());
    }

    @Test
    void rejectsSecretFieldsBeforeReceiverWrite() {
        when(receivers.get(1L)).thenReturn(new NoticeReceiverResponse(1L, "ops", (byte) 0, "email",
                new NoticeReceiverOptions(), Set.of(), null, null, null, null));
        assertThrows(IllegalArgumentException.class,
                () -> service.receiverUpdateMetadata(1L, null, Map.of("accessToken", "must-not-be-written")));
        verify(receivers, never()).update(any());
    }

    @Test
    void rejectsServerAssignedIdentifiersAndUnknownUpdateTargets() {
        when(validator.validate(any())).thenReturn(Set.of());
        NoticeRule rule = new NoticeRule();
        rule.setId(5L);
        assertThrows(IllegalArgumentException.class, () -> service.ruleCreate(rule));
        assertThrows(IllegalArgumentException.class, () -> service.ruleUpdate(rule));
        verify(notices, never()).addNoticeRule(any());
        verify(notices, never()).editNoticeRule(any());
    }

    @Test
    void reportsDeletionReadbackRatherThanAssumingSuccess() {
        NoticeTemplate template = new NoticeTemplate();
        template.setId(1L);
        when(notices.getNoticeTemplatesById(1L)).thenReturn(java.util.Optional.of(template));
        assertEquals(false, service.templateDelete(1L).get("deleted"));
        verify(notices).deleteNoticeTemplate(1L);
    }

    @Test
    void boundsPaginationBeforeCallingStorage() {
        assertThrows(IllegalArgumentException.class, () -> service.receiverList(null, -1, 10));
        assertThrows(IllegalArgumentException.class, () -> service.ruleList(null, 0, 101));
    }
}
