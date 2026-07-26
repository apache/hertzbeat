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
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
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
 * Agent Gateway run ledger entity.
 */
@Data
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "hzb_agent_run", indexes = {
        @Index(name = "idx_agent_run_uid", columnList = "run_uid"),
        @Index(name = "idx_agent_run_session", columnList = "session_id"),
        @Index(name = "idx_agent_run_target", columnList = "target_monitor_id, target_alert_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_agent_run_uid", columnNames = "run_uid"),
        @UniqueConstraint(name = "uk_agent_run_session_message", columnNames = {"session_id", "message_id"})
})
@AllArgsConstructor
@NoArgsConstructor
public class AgentRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_uid", nullable = false, length = 64)
    private String runUid;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "message_id", nullable = false, length = 128)
    private String messageId;

    @Column(name = "target_monitor_id")
    private Long targetMonitorId;

    @Column(name = "target_alert_id")
    private Long targetAlertId;

    @Column(name = "target_collector", length = 128)
    private String targetCollector;

    @Column(nullable = false, length = 32)
    private String status;

    @Lob
    @Column(name = "result_summary")
    private String resultSummary;

    @Column(name = "error_message", length = 1024)
    private String errorMessage;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreatedDate
    @Column(name = "gmt_create")
    private LocalDateTime gmtCreate;

    @LastModifiedDate
    @Column(name = "gmt_update")
    private LocalDateTime gmtUpdate;

}
