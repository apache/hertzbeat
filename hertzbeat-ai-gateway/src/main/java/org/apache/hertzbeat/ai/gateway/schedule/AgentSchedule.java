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
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.JsonLongListAttributeConverter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * System-level recurring Agent inspection rule.
 */
@Data
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "hzb_agent_schedule", indexes = {
        @Index(name = "idx_agent_schedule_due", columnList = "enabled, next_trigger_at"),
        @Index(name = "idx_agent_schedule_session", columnList = "session_id")
})
@AllArgsConstructor
@NoArgsConstructor
public class AgentSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false, length = 4096)
    private String instruction;

    @Column(name = "cron_expression", nullable = false, length = 64)
    private String cronExpression;

    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "session_id")
    private Long sessionId;

    @Convert(converter = JsonLongListAttributeConverter.class)
    @Column(name = "receiver_ids", nullable = false, length = 2048)
    private List<Long> receiverIds;

    @Column(name = "template_id")
    private Long templateId;

    @Column(name = "created_from_session_uid", length = 64)
    private String createdFromSessionUid;

    @Column(name = "last_trigger_at")
    private Long lastTriggerAt;

    @Column(name = "next_trigger_at")
    private Long nextTriggerAt;

    @CreatedBy
    @Column(length = 64)
    private String creator;

    @LastModifiedBy
    @Column(length = 64)
    private String modifier;

    @CreatedDate
    @Column(name = "gmt_create")
    private LocalDateTime gmtCreate;

    @LastModifiedDate
    @Column(name = "gmt_update")
    private LocalDateTime gmtUpdate;
}
