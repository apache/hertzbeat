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
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.alerter.JsonMapAttributeConverter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Directed relation between two observed entities.
 */
@Entity
@Table(name = "hzb_entity_relation", indexes = {
        @Index(name = "uk_hzb_entity_relation", columnList = "source_entity_id, target_entity_id, relation_type", unique = true),
        @Index(name = "idx_hzb_entity_relation_source", columnList = "source_entity_id"),
        @Index(name = "idx_hzb_entity_relation_target", columnList = "target_entity_id")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Entity relation")
@EntityListeners(AuditingEntityListener.class)
public class EntityRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Relation row ID", example = "1", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Source entity ID", example = "87584674384", accessMode = READ_WRITE)
    @Column(name = "source_entity_id", nullable = false)
    private Long sourceEntityId;

    @Schema(title = "Target entity ID", example = "87584674385", accessMode = READ_WRITE)
    @Column(name = "target_entity_id")
    private Long targetEntityId;

    @Schema(title = "Target entity reference", example = "service:commerce/payment-api", accessMode = READ_WRITE)
    @Size(max = 255)
    @Column(name = "target_ref", length = 255)
    private String targetRef;

    @Schema(title = "Relation type", example = "depends_on", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(name = "relation_type", length = 32, nullable = false)
    private String relationType;

    @Schema(title = "Relation source", example = "manual", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(name = "relation_source", length = 32, nullable = false)
    private String relationSource;

    @Schema(title = "Relation status", example = "confirmed", accessMode = READ_WRITE)
    @Size(max = 16)
    @Column(length = 16, nullable = false)
    private String status;

    @Schema(title = "Relation score", example = "100", accessMode = READ_WRITE)
    @Column(nullable = false)
    private Integer score;

    @Schema(title = "Relation description", example = "payment-service depends on mysql-primary", accessMode = READ_WRITE)
    @Size(max = 255)
    @Column(length = 255)
    private String description;

    @Schema(title = "Relation attributes", example = "{\"direction\":\"outbound\"}", accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 4096)
    private Map<String, String> attributes;

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
