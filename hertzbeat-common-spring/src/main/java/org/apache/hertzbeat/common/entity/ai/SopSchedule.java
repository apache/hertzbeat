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

package org.apache.hertzbeat.common.entity.ai;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Entity for storing scheduled SOP execution configurations.
 * Allows users to schedule automatic SOP executions with results pushed to conversations.
 */
@Data
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "hzb_sop_schedule", indexes = {
    @Index(name = "idx_schedule_conversation_id", columnList = "conversation_id"),
    @Index(name = "idx_schedule_enabled_next", columnList = "enabled, next_run_time")
})
@AllArgsConstructor
@NoArgsConstructor
public class SopSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Schema(title = "Conversation ID to push results to")
    @NotNull
    @Column(name = "conversation_id")
    private Long conversationId;

    @Schema(title = "Name of the SOP skill to execute")
    @NotBlank
    @Column(name = "sop_name", length = 64)
    private String sopName;

    @Schema(title = "SOP execution parameters in JSON format")
    @Column(name = "sop_params", length = 1024)
    private String sopParams;

    @Schema(title = "Cron expression for scheduling")
    @NotBlank
    @Column(name = "cron_expression", length = 64)
    private String cronExpression;

    @Schema(title = "Whether the schedule is enabled")
    @Builder.Default
    @Column(name = "enabled")
    private Boolean enabled = true;

    @Schema(title = "Last execution time")
    @Column(name = "last_run_time")
    private LocalDateTime lastRunTime;

    @Schema(title = "Next scheduled execution time")
    @Column(name = "next_run_time")
    private LocalDateTime nextRunTime;

    @Schema(title = "The creator of this record", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "The modifier of this record", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record create time", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
