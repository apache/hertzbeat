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

package org.apache.hertzbeat.common.entity.agent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Agent Gateway session entity.
 */
@Data
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "hzb_agent_session", indexes = {
        @Index(name = "idx_agent_session_uid", columnList = "session_uid"),
        @Index(name = "idx_agent_session_key", columnList = "session_key"),
        @Index(name = "idx_agent_session_owner", columnList = "channel, actor_type, actor_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_agent_session_uid", columnNames = "session_uid"),
        @UniqueConstraint(name = "uk_agent_session_key", columnNames = "session_key")
})
@AllArgsConstructor
@NoArgsConstructor
public class AgentSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_uid", nullable = false, length = 64)
    private String sessionUid;

    @Column(name = "session_key", nullable = false, length = 128)
    private String sessionKey;

    @Column(length = 64)
    private String channel;

    @Column(name = "conversation_id", length = 256)
    private String conversationId;

    @Column(name = "actor_type", length = 64)
    private String actorType;

    @Column(name = "actor_id", length = 128)
    private String actorId;

    @Column(name = "actor_roles", length = 1024)
    private String actorRoles;

    @Column(length = 32)
    @Enumerated(EnumType.STRING)
    private AgentSessionStatus status;

    @Column(length = 256)
    private String title;

    @Builder.Default
    @Column(name = "transcript_sequence", nullable = false)
    private Long transcriptSequence = 0L;

    @CreatedDate
    @Column(name = "gmt_create")
    private LocalDateTime gmtCreate;

    @LastModifiedDate
    @Column(name = "gmt_update")
    private LocalDateTime gmtUpdate;
}
