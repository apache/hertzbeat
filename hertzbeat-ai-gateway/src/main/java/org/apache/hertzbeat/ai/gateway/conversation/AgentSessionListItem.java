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

package org.apache.hertzbeat.ai.gateway.conversation;

import java.time.LocalDateTime;
import org.apache.hertzbeat.common.entity.agent.AgentSession;

/**
 * Session list projection whose status describes the latest durable run rather than session ownership lifecycle.
 */
public record AgentSessionListItem(
        Long id,
        String sessionUid,
        String conversationId,
        String status,
        String title,
        LocalDateTime gmtCreate,
        LocalDateTime gmtUpdate) {

    public static AgentSessionListItem from(AgentSession session, AgentRunListProjection latestRun) {
        String projectedStatus = latestRun == null ? "NO_RUN" : latestRun.status();
        LocalDateTime projectedUpdate = session.getGmtUpdate();
        if (latestRun != null && latestRun.gmtUpdate() != null
                && (projectedUpdate == null || latestRun.gmtUpdate().isAfter(projectedUpdate))) {
            projectedUpdate = latestRun.gmtUpdate();
        }
        return new AgentSessionListItem(
                session.getId(),
                session.getSessionUid(),
                session.getConversationId(),
                projectedStatus,
                session.getTitle(),
                session.getGmtCreate(),
                projectedUpdate);
    }
}
