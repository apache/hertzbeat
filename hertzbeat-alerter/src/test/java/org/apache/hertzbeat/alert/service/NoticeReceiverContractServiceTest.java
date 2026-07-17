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

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.alert.dto.NoticeReceiverMutationResponse;
import org.apache.hertzbeat.alert.dto.NoticeReceiverOptions;
import org.apache.hertzbeat.alert.dto.NoticeReceiverRequest;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NoticeReceiverContractServiceTest {

    @Mock
    private NoticeConfigService noticeConfigService;

    private NoticeReceiverContractService service;

    @BeforeEach
    void setUp() {
        service = new NoticeReceiverContractService(noticeConfigService, new NoticeReceiverContractMapper());
    }

    @Test
    void updatePreservesOmittedSecretsAndAuthoritativelyRereads() {
        NoticeReceiver existing = NoticeReceiver.builder()
                .id(5L)
                .name("old")
                .type((byte) 5)
                .accessToken("secret-token")
                .appSecret("optional-signing-secret")
                .build();
        NoticeReceiverRequest request = request(5L, (byte) 5);
        request.getOptions().setPhone("15500001111");
        AtomicReference<NoticeReceiver> persisted = new AtomicReference<>();
        when(noticeConfigService.getReceiverById(5L)).thenAnswer(invocation ->
                persisted.get() == null ? existing : persisted.get());
        doAnswer(invocation -> {
            persisted.set(invocation.getArgument(0));
            return null;
        }).when(noticeConfigService).editReceiver(any(NoticeReceiver.class));

        NoticeReceiverMutationResponse result = service.update(request);

        assertEquals("updated", result.status());
        assertEquals("secret-token", persisted.get().getAccessToken());
        assertEquals("optional-signing-secret", persisted.get().getAppSecret());
        assertTrue(result.receiver().configuredSecrets().contains("accessToken"));
        verify(noticeConfigService).editReceiver(any(NoticeReceiver.class));
    }

    @Test
    void rejectsOptionsThatDoNotBelongToType() {
        NoticeReceiverRequest request = request(null, (byte) 1);
        request.getOptions().setEmail("ops@example.com");
        request.getOptions().setAccessToken("must-not-be-accepted");

        assertThrows(IllegalArgumentException.class, () -> service.create(request));

        verify(noticeConfigService, never()).addReceiver(any(NoticeReceiver.class));
    }

    @Test
    void explicitSecretClearCannotSilentlyBreakRequiredConfiguration() {
        NoticeReceiver existing = NoticeReceiver.builder()
                .id(5L)
                .name("old")
                .type((byte) 5)
                .accessToken("secret-token")
                .build();
        NoticeReceiverRequest request = request(5L, (byte) 5);
        request.getOptions().getClearSecrets().add("accessToken");
        when(noticeConfigService.getReceiverById(5L)).thenReturn(existing);

        assertThrows(IllegalArgumentException.class, () -> service.update(request));

        verify(noticeConfigService, never()).editReceiver(any(NoticeReceiver.class));
    }

    @Test
    void updateReportsMissingWithoutWriting() {
        NoticeReceiverRequest request = request(5L, (byte) 3);
        when(noticeConfigService.getReceiverById(5L)).thenReturn(null);

        NoticeReceiverMutationResponse result = service.update(request);

        assertEquals("missing", result.status());
        verify(noticeConfigService, never()).editReceiver(any(NoticeReceiver.class));
    }

    private NoticeReceiverRequest request(Long id, byte type) {
        NoticeReceiverRequest request = new NoticeReceiverRequest();
        request.setId(id);
        request.setName("receiver");
        request.setType(type);
        request.setOptions(new NoticeReceiverOptions());
        return request;
    }
}
