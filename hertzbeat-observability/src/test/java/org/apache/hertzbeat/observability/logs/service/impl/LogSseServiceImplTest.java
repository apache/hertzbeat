/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.logs.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.observability.logs.sse.LogSseFilterCriteria;
import org.apache.hertzbeat.observability.logs.sse.LogSseManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@ExtendWith(MockitoExtension.class)
class LogSseServiceImplTest {

    @Mock
    private LogSseManager emitterManager;

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void subscribeBindsAuthenticatedWorkspaceInsteadOfClientValue() {
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("team-a");
        LogSseFilterCriteria criteria = new LogSseFilterCriteria();
        criteria.setWorkspaceId("client-controlled");
        when(emitterManager.createEmitter(anyLong(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new SseEmitter());

        new LogSseServiceImpl(emitterManager).subscribe(criteria);

        ArgumentCaptor<LogSseFilterCriteria> captor = ArgumentCaptor.forClass(LogSseFilterCriteria.class);
        verify(emitterManager).createEmitter(anyLong(), captor.capture());
        assertEquals("team-a", captor.getValue().getWorkspaceId());
    }

    @Test
    void subscribeRejectsMissingAuthenticatedWorkspaceBeforeCreatingEmitter() {
        LogSseFilterCriteria criteria = new LogSseFilterCriteria();
        criteria.setWorkspaceId("client-controlled");

        assertThrows(IllegalArgumentException.class,
                () -> new LogSseServiceImpl(emitterManager).subscribe(criteria));

        verify(emitterManager, never()).createEmitter(anyLong(), org.mockito.ArgumentMatchers.any());
    }
}
