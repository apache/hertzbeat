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

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
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
 * Agent Gateway tool call ledger entity.
 */
@Data
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "hzb_agent_tool_call", indexes = {
        @Index(name = "idx_agent_tool_call_run", columnList = "run_id"),
        @Index(name = "idx_agent_tool_call_session", columnList = "session_id"),
        @Index(name = "idx_agent_tool_call_name", columnList = "tool_name"),
        @Index(name = "idx_agent_tool_call_status", columnList = "status"),
        @Index(name = "idx_agent_tool_call_approval_status", columnList = "approval_status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_agent_tool_call_run_call", columnNames = {"run_id", "tool_call_id"}),
        @UniqueConstraint(name = "uk_agent_tool_call_approval_id", columnNames = "approval_id")
})
@AllArgsConstructor
@NoArgsConstructor
public class AgentToolCall {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tool_call_id", nullable = false, length = 128)
    private String toolCallId;

    @Column(name = "run_id", nullable = false)
    private Long runId;

    @Column(name = "session_id")
    private Long sessionId;

    @Column(name = "run_uid", length = 64)
    private String runUid;

    @Column(name = "session_uid", length = 64)
    private String sessionUid;

    @Column(name = "tool_name", nullable = false, length = 128)
    private String toolName;

    @Column(length = 64)
    private String exposure;

    @Column(length = 32)
    private String risk;

    @Column(name = "policy_decision", length = 32)
    private String policyDecision;

    @Column(nullable = false, length = 32)
    private String status;

    @JsonIgnore
    @Column(name = "input_json", columnDefinition = "TEXT")
    private String inputJson;

    @Column(name = "input_hash", length = 64)
    private String inputHash;

    @Column(name = "approval_id", length = 64)
    private String approvalId;

    @Column(name = "approval_status", length = 32)
    private String approvalStatus;

    @Column(name = "approval_expires_at")
    private LocalDateTime approvalExpiresAt;

    @Column(name = "approval_decided_at")
    private LocalDateTime approvalDecidedAt;

    @Column(name = "approval_actor_type", length = 64)
    private String approvalActorType;

    @Column(name = "approval_actor_id", length = 128)
    private String approvalActorId;

    @Column(name = "approval_reason", length = 1024)
    private String approvalReason;

    @Column(name = "result_output", columnDefinition = "TEXT")
    private String resultOutput;

    @Column(name = "elapsed_ms")
    private Long elapsedMs;

    @Column(name = "error_message", length = 1024)
    private String errorMessage;

    @CreatedDate
    @Column(name = "gmt_create")
    private LocalDateTime gmtCreate;

    @LastModifiedDate
    @Column(name = "gmt_update")
    private LocalDateTime gmtUpdate;

}
