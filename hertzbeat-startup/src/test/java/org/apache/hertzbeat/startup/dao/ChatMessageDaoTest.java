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

package org.apache.hertzbeat.startup.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;

import jakarta.annotation.Resource;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import org.apache.hertzbeat.ai.dao.ChatConversationDao;
import org.apache.hertzbeat.ai.dao.ChatMessageDao;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.apache.hertzbeat.startup.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI 会话消息持久化映射测试。
 */
@Transactional
class ChatMessageDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private ChatConversationDao conversationDao;

    @Resource
    private ChatMessageDao messageDao;

    @PersistenceContext
    private EntityManager entityManager;

    @Test
    void saveMessageShouldPersistConversationId() {
        ChatConversation conversation = conversationDao.saveAndFlush(
            ChatConversation.builder().title("映射测试会话").build());
        messageDao.saveAndFlush(ChatMessage.builder()
            .conversationId(conversation.getId())
            .role("user")
            .content("映射测试消息")
            .build());
        entityManager.clear();

        List<ChatMessage> messages = messageDao
            .findByConversationIdOrderByGmtCreateAsc(conversation.getId());

        assertEquals(1, messages.size());
        assertEquals(conversation.getId(), messages.getFirst().getConversationId());
    }
}
