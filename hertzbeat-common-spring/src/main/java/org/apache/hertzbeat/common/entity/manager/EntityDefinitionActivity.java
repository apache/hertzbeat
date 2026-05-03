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
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Persisted definition-first activity for an entity.
 */
@Entity
@Table(name = "hzb_entity_definition_activity", indexes = {
        @Index(name = "idx_hzb_entity_definition_activity_entity", columnList = "entity_id"),
        @Index(name = "idx_hzb_entity_definition_activity_time", columnList = "gmt_create")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Entity definition activity")
@EntityListeners(AuditingEntityListener.class)
public class EntityDefinitionActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Activity row ID", example = "1", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Entity ID", example = "87584674384", accessMode = READ_WRITE)
    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Schema(title = "Activity type", example = "definition_import", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(name = "activity_type", length = 32, nullable = false)
    private String activityType;

    @Schema(title = "Definition format", example = "yaml", accessMode = READ_WRITE)
    @Size(max = 16)
    @Column(length = 16, nullable = false)
    private String format;

    @Schema(title = "Activity status", example = "success", accessMode = READ_WRITE)
    @Size(max = 16)
    @Column(length = 16, nullable = false)
    private String status;

    @Schema(title = "Activity summary", example = "Definition imported", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(length = 128, nullable = false)
    private String summary;

    @Schema(title = "Activity detail", example = "service definition imported by yaml bundle", accessMode = READ_WRITE)
    @Size(max = 255)
    @Column(length = 255)
    private String detail;

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "Record create time", example = "2024-07-02T20:09:34.903217", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;
}
