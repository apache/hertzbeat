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

package org.apache.hertzbeat.ai.tools.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import java.util.Optional;
import org.apache.hertzbeat.ai.config.McpContextHolder;
import org.apache.hertzbeat.ai.dao.ChatConversationDao;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Verifies that protected monitor creation cannot load another user's
 * conversation credentials.
 */
@ExtendWith(MockitoExtension.class)
class MonitorToolsImplTest {

    @Mock
    private MonitorService monitorService;

    @Mock
    private AppService appService;

    @Mock
    private ChatConversationDao conversationDao;

    @InjectMocks
    private MonitorToolsImpl monitorTools;

    @AfterEach
    void clearContext() {
        McpContextHolder.clear();
    }

    @Test
    void protectedAddShouldRejectConversationOutsideCurrentCreator() {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.getPrincipal()).thenReturn("alice");
        McpContextHolder.setSubject(subject);
        when(conversationDao.findByIdAndCreator(10L, "alice")).thenReturn(Optional.empty());

        String result = monitorTools.addMonitorProtected(
                10L, "database", "mysql", 60, "{\"host\":\"db.local\"}", null);

        assertEquals("Error: Conversation not found or inaccessible", result);
        verify(conversationDao).findByIdAndCreator(10L, "alice");
        verifyNoInteractions(monitorService);
    }
}
