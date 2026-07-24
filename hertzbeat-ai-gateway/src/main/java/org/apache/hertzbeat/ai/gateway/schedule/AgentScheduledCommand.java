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

package org.apache.hertzbeat.ai.gateway.schedule;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Recurring Gateway command that replays a user input through the standard runtime entry.
 */
@Data
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "hzb_agent_scheduled_command", indexes = {
        @Index(name = "idx_agent_scheduled_command_session", columnList = "session_id"),
        @Index(name = "idx_agent_scheduled_command_due", columnList = "enabled, next_run_time")
})
@AllArgsConstructor
@NoArgsConstructor
public class AgentScheduledCommand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "channel", nullable = false, length = 64)
    private String channel;

    @Column(name = "conversation_id", nullable = false, length = 256)
    private String conversationId;

    @Column(name = "actor_type", nullable = false, length = 64)
    private String actorType;

    @Column(name = "actor_id", nullable = false, length = 128)
    private String actorId;

    @Column(name = "actor_roles", nullable = false, length = 1024)
    private String actorRoles;

    @Column(name = "message", nullable = false, length = 4096)
    private String message;

    @Column(name = "cron_expression", nullable = false, length = 64)
    private String cronExpression;

    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "last_run_time")
    private LocalDateTime lastRunTime;

    @Column(name = "next_run_time")
    private LocalDateTime nextRunTime;

    @CreatedDate
    @Column(name = "gmt_create")
    private LocalDateTime gmtCreate;

    @LastModifiedDate
    @Column(name = "gmt_update")
    private LocalDateTime gmtUpdate;
}
