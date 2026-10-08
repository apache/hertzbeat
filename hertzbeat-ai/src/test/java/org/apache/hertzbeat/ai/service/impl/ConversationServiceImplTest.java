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

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.dao.ChatConversationDao;
import org.apache.hertzbeat.ai.dao.ChatMessageDao;
import org.apache.hertzbeat.ai.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.service.ChatClientProviderService;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Flux;

class ConversationServiceImplTest {

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
        when(conversations.findById(7L)).thenReturn(Optional.of(conversation));
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
}
