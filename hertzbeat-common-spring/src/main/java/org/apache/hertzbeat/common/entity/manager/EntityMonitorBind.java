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

package org.apache.hertzbeat.common.entity.manager;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
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
 * Binding between a monitor task and an observed entity.
 */
@Entity
@Table(name = "hzb_entity_monitor_bind", indexes = {
        @Index(name = "uk_hzb_entity_monitor_bind", columnList = "entity_id, monitor_id", unique = true),
        @Index(name = "idx_hzb_entity_monitor_bind_entity", columnList = "entity_id"),
        @Index(name = "idx_hzb_entity_monitor_bind_monitor", columnList = "monitor_id")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Entity monitor binding")
@EntityListeners(AuditingEntityListener.class)
public class EntityMonitorBind {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Binding row ID", example = "1", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Entity ID", example = "87584674384", accessMode = READ_WRITE)
    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Schema(title = "Monitor ID", example = "87584674385", accessMode = READ_WRITE)
    @Column(name = "monitor_id", nullable = false)
    private Long monitorId;

    @Schema(title = "Binding type", example = "manual", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(name = "bind_type", length = 32, nullable = false)
    private String bindType;

    @Schema(title = "Binding source", example = "service.name", accessMode = READ_WRITE)
    @Size(max = 64)
    @Column(name = "bind_source", length = 64, nullable = false)
    private String bindSource;

    @Schema(title = "Binding status", example = "active", accessMode = READ_WRITE)
    @Size(max = 16)
    @Column(length = 16, nullable = false)
    private String status;

    @Schema(title = "Binding score", example = "120", accessMode = READ_WRITE)
    @Column(nullable = false)
    private Integer score;

    @Schema(title = "Matched identities", example = "{\"service.name\":[\"payment-service\"]}", accessMode = READ_WRITE)
    @Convert(converter = JsonMapListAttributeConverter.class)
    @Column(name = "match_context", length = 4096)
    private Map<String, List<String>> matchContext;

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "The modifier of this record", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record create time", example = "2024-07-02T20:09:34.903217", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", example = "2024-07-02T20:09:34.903217", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
