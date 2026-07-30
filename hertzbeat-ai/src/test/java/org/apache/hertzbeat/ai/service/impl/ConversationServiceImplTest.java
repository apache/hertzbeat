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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.apache.hertzbeat.ai.dao.ChatConversationDao;
import org.apache.hertzbeat.ai.dao.ChatMessageDao;
import org.apache.hertzbeat.ai.dao.SopScheduleDao;
import org.apache.hertzbeat.ai.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.pojo.dto.ChatResponseChunk;
import org.apache.hertzbeat.ai.pojo.dto.SecurityData;
import org.apache.hertzbeat.ai.service.ChatClientProviderService;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
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
    private SopScheduleDao sopScheduleDao;

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
        SubjectSum subject = bindSubject("alice");
        ChatConversation conversation = ChatConversation.builder()
            .id(CONVERSATION_ID)
            .title("Named conversation")
            .creator("alice")
            .build();
        List<ChatMessage> history = List.of(
            ChatMessage.builder()
                .id(11L)
                .conversationId(CONVERSATION_ID)
                .role("user")
                .content("Previous question")
                .build(),
            ChatMessage.builder()
                .id(12L)
                .conversationId(CONVERSATION_ID)
                .role("assistant")
                .content("Previous answer")
                .build());
        AtomicLong messageId = new AtomicLong(20L);

        when(chatClientProviderService.isConfigured()).thenReturn(true);
        when(conversationDao.findByIdAndCreator(CONVERSATION_ID, "alice"))
            .thenReturn(Optional.of(conversation));
        when(messageDao.findByConversationIdOrderByGmtCreateAsc(CONVERSATION_ID)).thenReturn(history);
        when(messageDao.save(any(ChatMessage.class))).thenAnswer(invocation -> {
            ChatMessage savedMessage = invocation.getArgument(0);
            savedMessage.setId(messageId.getAndIncrement());
            return savedMessage;
        });
        when(chatClientProviderService.streamChat(any(ChatRequestContext.class)))
            .thenReturn(Flux.just("Current answer"));

        List<ServerSentEvent<ChatResponseChunk>> events = conversationService
            .streamChat("Current question", CONVERSATION_ID)
            .collectList()
            .block();

        assertNotNull(events);
        assertEquals(2, events.size());
        ArgumentCaptor<ChatRequestContext> contextCaptor = ArgumentCaptor.forClass(ChatRequestContext.class);
        verify(chatClientProviderService).streamChat(contextCaptor.capture());
        assertEquals(history, contextCaptor.getValue().getConversationHistory());
        assertEquals(subject, contextCaptor.getValue().getSubject());
    }

    /**
     * Deleting a conversation must remove its schedules before they can push more messages.
     */
    @Test
    void deleteConversationShouldRemoveSchedulesMessagesAndConversationInOrder() {
        bindSubject("alice");
        ChatConversation conversation = ChatConversation.builder()
            .id(CONVERSATION_ID)
            .title("Owned conversation")
            .creator("alice")
            .build();
        ChatMessage message = ChatMessage.builder()
            .id(11L)
            .conversationId(CONVERSATION_ID)
            .role("user")
            .content("message to delete")
            .build();
        when(conversationDao.findByIdAndCreator(CONVERSATION_ID, "alice"))
            .thenReturn(Optional.of(conversation));
        when(messageDao.findByConversationIdOrderByGmtCreateAsc(CONVERSATION_ID))
            .thenReturn(List.of(message));

        conversationService.deleteConversation(CONVERSATION_ID);

        InOrder deletionOrder = inOrder(sopScheduleDao, messageDao, conversationDao);
        deletionOrder.verify(sopScheduleDao).deleteByConversationId(CONVERSATION_ID);
        deletionOrder.verify(messageDao).deleteAll(List.of(message));
        deletionOrder.verify(conversationDao).deleteById(CONVERSATION_ID);
    }

    @Test
    void listConversationsShouldExcludeOtherCreators() {
        bindSubject("alice");
        ChatConversation ownedConversation = ChatConversation.builder()
            .id(CONVERSATION_ID)
            .title("Owned conversation")
            .creator("alice")
            .build();
        when(conversationDao.findAllByCreatorOrderByIdDesc("alice"))
            .thenReturn(List.of(ownedConversation));
        when(messageDao.findByConversationIdInOrderByGmtCreateAsc(List.of(CONVERSATION_ID)))
            .thenReturn(List.of());

        List<ChatConversation> result = conversationService.getAllConversations();

        assertEquals(List.of(ownedConversation), result);
        verify(conversationDao).findAllByCreatorOrderByIdDesc("alice");
    }

    @Test
    void getConversationShouldRejectAnotherCreator() {
        bindSubject("alice");
        when(conversationDao.findByIdAndCreator(CONVERSATION_ID, "alice"))
            .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
            () -> conversationService.getConversation(CONVERSATION_ID));
        verify(messageDao, never()).findByConversationIdOrderByGmtCreateAsc(CONVERSATION_ID);
    }

    @Test
    void deleteConversationShouldRejectAnotherCreator() {
        bindSubject("alice");
        when(conversationDao.findByIdAndCreator(CONVERSATION_ID, "alice"))
            .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
            () -> conversationService.deleteConversation(CONVERSATION_ID));
        verify(sopScheduleDao, never()).deleteByConversationId(CONVERSATION_ID);
        verify(conversationDao, never()).deleteById(CONVERSATION_ID);
    }

    @Test
    void streamChatShouldRejectAnotherCreator() {
        bindSubject("alice");
        when(conversationDao.findByIdAndCreator(CONVERSATION_ID, "alice"))
            .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
            () -> conversationService.streamChat("Current question", CONVERSATION_ID));
        verify(messageDao, never()).save(any(ChatMessage.class));
    }

    @Test
    void createConversationShouldRecordCurrentCreator() {
        bindSubject("alice");
        when(conversationDao.save(any(ChatConversation.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        ChatConversation conversation = conversationService.createConversation();

        assertEquals("alice", conversation.getCreator());
    }

    @Test
    void saveSecurityDataShouldRejectAnotherCreator() {
        bindSubject("alice");
        SecurityData securityData = new SecurityData();
        securityData.setConversationId(CONVERSATION_ID);
        securityData.setSecurityData("sensitive-value");
        when(conversationDao.findByIdAndCreator(CONVERSATION_ID, "alice"))
            .thenReturn(Optional.empty());

        assertFalse(conversationService.saveSecurityData(securityData));
        verify(conversationDao, never()).save(any(ChatConversation.class));
    }

    private SubjectSum bindSubject(String principal) {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.getPrincipal()).thenReturn(principal);
        SurenessContextHolder.bindSubject(subject);
        return subject;
    }
}
