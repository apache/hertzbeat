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
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import tools.jackson.databind.JsonNode;

/**
 * Shared governance state for catalog workflows such as discovery presets and helper activities.
 */
@Entity
@Table(name = "hzb_entity_governance_state",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_hzb_entity_governance_state_scope_kind_workspace_key",
                        columnNames = {"state_scope", "state_kind", "workspace_id", "state_key"})
        },
        indexes = {
                @Index(name = "idx_hzb_entity_governance_state_scope_kind", columnList = "state_scope,state_kind"),
                @Index(name = "idx_hzb_entity_governance_state_scope_kind_workspace",
                        columnList = "state_scope,state_kind,workspace_id"),
                @Index(name = "idx_hzb_entity_governance_state_update", columnList = "gmt_update"),
                @Index(name = "idx_hzb_entity_governance_state_creator", columnList = "creator")
        })
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Shared entity governance state")
@EntityListeners(AuditingEntityListener.class)
public class EntityGovernanceState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "State row ID", example = "1", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "State scope", example = "discovery", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(name = "state_scope", length = 32, nullable = false)
    private String stateScope;

    @Schema(title = "State kind", example = "preset", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(name = "state_kind", length = 32, nullable = false)
    private String stateKind;

    @Schema(title = "Workspace ID", example = "default", accessMode = READ_WRITE)
    @Size(max = 64)
    @Column(name = "workspace_id", length = 64)
    @Builder.Default
    private String workspaceId = AuthTokenScopes.DEFAULT_WORKSPACE_ID;

    @Schema(title = "State key", example = "preset-1710000000", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(name = "state_key", length = 128, nullable = false)
    private String stateKey;

    @Schema(title = "State display name", example = "Prod governance baseline", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(name = "state_name", length = 128)
    private String stateName;

    @Schema(title = "State status", example = "success", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(length = 32)
    private String status;

    @Schema(title = "State JSON content", accessMode = READ_WRITE)
    @Convert(converter = JsonNodeAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private JsonNode content;

    @Schema(title = "Creator", example = "admin", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "Create time", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Update time", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
