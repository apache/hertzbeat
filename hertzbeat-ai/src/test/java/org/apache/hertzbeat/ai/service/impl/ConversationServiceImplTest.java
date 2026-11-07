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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.dao.ChatConversationDao;
import org.apache.hertzbeat.ai.dao.ChatMessageDao;
import org.apache.hertzbeat.ai.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.pojo.dto.ChatResponseChunk;
import org.apache.hertzbeat.ai.service.ChatClientProviderService;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;

class ConversationServiceImplTest {

    @BeforeEach
    void bindSubject() {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.getPrincipal()).thenReturn("alice");
        SurenessContextHolder.bindSubject(subject);
    }

    @AfterEach
    void clearSubject() {
        SurenessContextHolder.clear();
    }

    @Test
    void followUpPreservesTheLatestPriorAssistantReply() {
        ChatConversationDao conversations = mock(ChatConversationDao.class);
        ChatMessageDao messages = mock(ChatMessageDao.class);
        ChatClientProviderService provider = mock(ChatClientProviderService.class);
        ConversationServiceImpl service = new ConversationServiceImpl();
        ReflectionTestUtils.setField(service, "conversationDao", conversations);
        ReflectionTestUtils.setField(service, "messageDao", messages);
        ReflectionTestUtils.setField(service, "chatClientProviderService", provider);
        ChatConversation conversation = new ChatConversation();
        conversation.setId(7L);
        conversation.setTitle("Service investigation");
        ChatMessage question = ChatMessage.builder().id(1L).role("user").content("First question").build();
        ChatMessage answer = ChatMessage.builder().id(2L).role("assistant").content("Previous answer").build();
        List<ChatMessage> prior = List.of(question, answer);
        when(provider.isConfigured()).thenReturn(true);
        when(conversations.findByIdAndCreator(7L, "alice")).thenReturn(Optional.of(conversation));
        when(messages.findByConversationIdOrderByGmtCreateAsc(7L)).thenReturn(prior);
        when(messages.save(any(ChatMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(provider.streamChat(any())).thenReturn(Flux.just("Follow-up answer"));

        service.streamChat("Explain that answer", 7L).collectList().block();

        ArgumentCaptor<ChatRequestContext> context = ArgumentCaptor.forClass(ChatRequestContext.class);
        verify(provider).streamChat(context.capture());
        assertThat(context.getValue().getConversationHistory()).containsExactly(question, answer);
        assertThat(context.getValue().getMessage()).isEqualTo("Explain that answer");
        assertThat(prior).containsExactly(question, answer);
    }

    @Test
    void streamChatReturnsResponseBodyOnWebClientResponseException() {
        ChatConversationDao conversations = mock(ChatConversationDao.class);
        ChatMessageDao messages = mock(ChatMessageDao.class);
        ChatClientProviderService provider = mock(ChatClientProviderService.class);
        ConversationServiceImpl service = new ConversationServiceImpl();
        ReflectionTestUtils.setField(service, "conversationDao", conversations);
        ReflectionTestUtils.setField(service, "messageDao", messages);
        ReflectionTestUtils.setField(service, "chatClientProviderService", provider);
        ChatConversation conversation = new ChatConversation();
        conversation.setId(8L);
        conversation.setTitle("Error test");
        when(provider.isConfigured()).thenReturn(true);
        when(conversations.findByIdAndCreator(8L, "alice")).thenReturn(Optional.of(conversation));
        when(messages.findByConversationIdOrderByGmtCreateAsc(8L)).thenReturn(List.of());
        when(messages.save(any(ChatMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WebClientResponseException badRequestException = WebClientResponseException.create(
                400, "Bad Request", HttpHeaders.EMPTY,
                "deepseek-reasoner does not support the parameter temperature".getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8);
        when(provider.streamChat(any())).thenReturn(Flux.error(badRequestException));

        List<ServerSentEvent<ChatResponseChunk>> events =
                service.streamChat("Hello", 8L).collectList().block();

        assertThat(events).isNotNull().hasSize(1);
        assertThat(events.get(0).event()).isEqualTo("error");
        assertThat(events.get(0).data().getResponse())
                .contains("deepseek-reasoner does not support the parameter temperature");
    }
}
