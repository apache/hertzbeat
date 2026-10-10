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
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Normalized entity identity row.
 */
@Entity
@Table(name = "hzb_entity_identity", indexes = {
        @Index(name = "uk_hzb_entity_identity", columnList = "entity_id, identity_key, normalized_value", unique = true),
        @Index(name = "idx_hzb_entity_identity_lookup", columnList = "identity_key, normalized_value"),
        @Index(name = "idx_hzb_entity_identity_entity", columnList = "entity_id")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Entity identity")
@EntityListeners(AuditingEntityListener.class)
public class EntityIdentity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Identity row ID", example = "1", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Entity ID", example = "87584674384", accessMode = READ_WRITE)
    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Schema(title = "Identity source type", example = "otel_resource", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(name = "identity_type", length = 32, nullable = false)
    private String identityType;

    @Schema(title = "Identity key", example = "service.name", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(name = "identity_key", length = 128, nullable = false)
    private String identityKey;

    @Schema(title = "Identity value", example = "payment-service", accessMode = READ_WRITE)
    @Size(max = 512)
    @Column(name = "identity_value", length = 512, nullable = false)
    private String identityValue;

    @Schema(title = "Normalized identity value", example = "payment-service", accessMode = READ_WRITE)
    @Size(max = 512)
    @Column(name = "normalized_value", length = 512, nullable = false)
    private String normalizedValue;

    @Schema(title = "Identity priority", example = "100", accessMode = READ_WRITE)
    @Column(nullable = false)
    private Integer priority;

    @Schema(title = "Whether it is a primary identity", example = "true", accessMode = READ_WRITE)
    @Column(name = "primary_identity", nullable = false)
    private boolean primaryIdentity;

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
