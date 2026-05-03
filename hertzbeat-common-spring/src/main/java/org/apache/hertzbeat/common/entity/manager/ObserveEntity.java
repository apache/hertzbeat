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
import org.apache.hertzbeat.common.entity.alerter.JsonMapAttributeConverter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import tools.jackson.databind.JsonNode;

/**
 * Operable observed entity used as the phase-1 entity-centric entry.
 */
@Entity
@Table(name = "hzb_entity", indexes = {
        @Index(name = "idx_hzb_entity_type", columnList = "entity_type"),
        @Index(name = "idx_hzb_entity_status", columnList = "status"),
        @Index(name = "idx_hzb_entity_name", columnList = "name"),
        @Index(name = "idx_hzb_entity_owner", columnList = "owner")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Observed entity")
@EntityListeners(AuditingEntityListener.class)
public class ObserveEntity {

    @Id
    @Schema(title = "Entity ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Entity type", example = "service", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(name = "entity_type", length = 32, nullable = false)
    private String type;

    @Schema(title = "Entity name", example = "payment-service", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(length = 128, nullable = false)
    private String name;

    @Schema(title = "Entity display name", example = "Payment Service", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(name = "display_name", length = 128)
    private String displayName;

    @Schema(title = "Entity subtype from HertzBeat definition spec.type", example = "web-service", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(name = "sub_type", length = 128)
    private String subtype;

    @Schema(title = "Entity namespace", example = "production", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(length = 128)
    private String namespace;

    @Schema(title = "Deployment environment", example = "prod", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(length = 128)
    private String environment;

    @Schema(title = "Aggregated entity status", example = "healthy", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(length = 32, nullable = false)
    private String status;

    @Schema(title = "Entity criticality", example = "high", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(length = 32)
    private String criticality;

    @Schema(title = "Entity owner", example = "team-sre", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(length = 128)
    private String owner;

    @Schema(title = "Additional entity owners", accessMode = READ_WRITE)
    @Convert(converter = JsonEntityOwnerRefListAttributeConverter.class)
    @Column(name = "additional_owners", columnDefinition = "TEXT")
    private List<EntityOwnerRef> additionalOwners;

    @Schema(title = "Runbook URL or identifier", example = "https://runbook.example.com/payment", accessMode = READ_WRITE)
    @Size(max = 512)
    @Column(length = 512)
    private String runbook;

    @Schema(title = "Entity lifecycle", example = "production", accessMode = READ_WRITE)
    @Size(max = 64)
    @Column(length = 64)
    private String lifecycle;

    @Schema(title = "Entity tier", example = "tier1", accessMode = READ_WRITE)
    @Size(max = 64)
    @Column(length = 64)
    private String tier;

    @Schema(title = "Owning system", example = "commerce", accessMode = READ_WRITE)
    @Size(max = 128)
    @Column(name = "system_name", length = 128)
    private String system;

    @Schema(title = "Parent components or systems", accessMode = READ_WRITE)
    @Convert(converter = JsonStringListAttributeConverter.class)
    @Column(name = "component_of", columnDefinition = "TEXT")
    private List<String> componentOf;

    @Schema(title = "Child components that belong to this system", accessMode = READ_WRITE)
    @Convert(converter = JsonStringListAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> components;

    @Schema(title = "HertzBeat API spec implementedBy references", accessMode = READ_WRITE)
    @Convert(converter = JsonStringListAttributeConverter.class)
    @Column(name = "implemented_by", columnDefinition = "TEXT")
    private List<String> implementedBy;

    @Schema(title = "HertzBeat API interface definition or file reference", accessMode = READ_WRITE)
    @Convert(converter = JsonNodeAttributeConverter.class)
    @Column(name = "api_interface", columnDefinition = "TEXT")
    private JsonNode apiInterface;

    @Schema(title = "Entity inheritance reference", example = "service:platform/base-service", accessMode = READ_WRITE)
    @Size(max = 255)
    @Column(name = "inherit_from", length = 255)
    private String inheritFrom;

    @Schema(title = "Programming languages", accessMode = READ_WRITE)
    @Convert(converter = JsonStringListAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> languages;

    @Schema(title = "Entity links", accessMode = READ_WRITE)
    @Convert(converter = JsonEntityCatalogLinkListAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<EntityCatalogLink> links;

    @Schema(title = "Entity contacts", accessMode = READ_WRITE)
    @Convert(converter = JsonEntityCatalogContactListAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<EntityCatalogContact> contacts;

    @Schema(title = "Entity integrations metadata", accessMode = READ_WRITE)
    @Convert(converter = JsonNodeAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private JsonNode integrations;

    @Schema(title = "Entity custom extensions", accessMode = READ_WRITE)
    @Convert(converter = JsonNodeAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private JsonNode extensions;

    @Schema(title = "HertzBeat-specific entity metadata", accessMode = READ_WRITE)
    @Convert(converter = JsonNodeAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private JsonNode hertzbeat;

    @Schema(title = "Entity source", example = "manual", accessMode = READ_WRITE)
    @Size(max = 32)
    @Column(length = 32, nullable = false)
    private String source;

    @Schema(title = "Entity description", example = "Core payment checkout service", accessMode = READ_WRITE)
    @Size(max = 512)
    @Column(length = 512)
    private String description;

    @Schema(title = "Entity labels", example = "{\"team\":\"payments\"}", accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 4096)
    private Map<String, String> labels;

    @Schema(title = "Entity catalog tags", example = "[\"team:payments\",\"region:cn-shanghai\"]", accessMode = READ_WRITE)
    @Convert(converter = JsonStringListAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> tags;

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
