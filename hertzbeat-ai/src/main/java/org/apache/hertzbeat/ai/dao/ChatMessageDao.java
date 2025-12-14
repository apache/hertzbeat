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

package org.apache.hertzbeat.ai.dao;

import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for Message entities
 */
@Repository
public interface ChatMessageDao extends JpaRepository<ChatMessage, Long> {

    /**
     * Find all messages by conversation id, ordered by create time
     * @param conversationId conversation id
     * @return list of messages
     */
    List<ChatMessage> findByConversationIdOrderByGmtCreateAsc(Long conversationId);

    /**
     * Find all messages by conversation ids, ordered by create time
     * @param conversationIds list of conversation ids
     * @return list of messages
     */
    List<ChatMessage> findByConversationIdInOrderByGmtCreateAsc(List<Long> conversationIds);
}
