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

package org.apache.hertzbeat.ai.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.apache.hertzbeat.ai.dao.ChatConversationDao;
import org.apache.hertzbeat.ai.dao.ChatMessageDao;
import org.apache.hertzbeat.ai.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.pojo.dto.ChatResponseChunk;
import org.apache.hertzbeat.ai.service.ChatClientProviderService;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

/**
 * Tests multi-turn conversation context handling in {@link ConversationServiceImpl}.
 */
@ExtendWith(MockitoExtension.class)
class ConversationServiceImplTest {

    private static final long CONVERSATION_ID = 1L;

    @Mock
    private ChatConversationDao conversationDao;

    @Mock
    private ChatMessageDao messageDao;

    @Mock
    private ChatClientProviderService chatClientProviderService;

    @InjectMocks
    private ConversationServiceImpl conversationService;

    @AfterEach
    void clearSecurityContext() {
        SurenessContextHolder.clear();
    }

    @Test
    void streamChatShouldKeepCompleteConversationHistory() {
        SubjectSum subject = org.mockito.Mockito.mock(SubjectSum.class);
        SurenessContextHolder.bindSubject(subject);
        ChatConversation conversation = ChatConversation.builder()
            .id(CONVERSATION_ID)
            .title("已命名会话")
            .build();
        List<ChatMessage> history = List.of(
            ChatMessage.builder()
                .id(11L)
                .conversationId(CONVERSATION_ID)
                .role("user")
                .content("上一轮问题")
                .build(),
            ChatMessage.builder()
                .id(12L)
                .conversationId(CONVERSATION_ID)
                .role("assistant")
                .content("上一轮回答")
                .build());
        AtomicLong messageId = new AtomicLong(20L);

        when(chatClientProviderService.isConfigured()).thenReturn(true);
        when(conversationDao.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(messageDao.findByConversationIdOrderByGmtCreateAsc(CONVERSATION_ID)).thenReturn(history);
        when(messageDao.save(any(ChatMessage.class))).thenAnswer(invocation -> {
            ChatMessage savedMessage = invocation.getArgument(0);
            savedMessage.setId(messageId.getAndIncrement());
            return savedMessage;
        });
        when(chatClientProviderService.streamChat(any(ChatRequestContext.class)))
            .thenReturn(Flux.just("本轮回答"));

        List<ServerSentEvent<ChatResponseChunk>> events = conversationService
            .streamChat("本轮问题", CONVERSATION_ID)
            .collectList()
            .block();

        assertNotNull(events);
        assertEquals(2, events.size());
        ArgumentCaptor<ChatRequestContext> contextCaptor = ArgumentCaptor.forClass(ChatRequestContext.class);
        verify(chatClientProviderService).streamChat(contextCaptor.capture());
        assertEquals(history, contextCaptor.getValue().getConversationHistory());
        assertEquals(subject, contextCaptor.getValue().getSubject());
    }
}
