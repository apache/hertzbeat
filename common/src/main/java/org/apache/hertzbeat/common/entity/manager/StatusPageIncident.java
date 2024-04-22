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

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.CascadeType;
import jakarta.persistence.ConstraintMode;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
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
 * status page incident entity
 */
@Entity
@Table(name = "hzb_status_page_incident")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "status page incident entity")
@EntityListeners(AuditingEntityListener.class)
public class StatusPageIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "ID", example = "87584674384")
    private Long id;
    
    @Schema(title = "org id", example = "1234")
    private Long orgId;

    @Schema(title = "incident name", example = "Gateway")
    @NotBlank
    private String name;
    
    @Schema(title = "incident current state: 0-Investigating 1-Identified 2-Monitoring 3-Resolved", example = "0")
    private byte state;

    @Schema(title = "incident start Investigating timestamp", example = "4248574985744")
    private Long startTime;

    @Schema(title = "incident end Resolved timestamp", example = "4248574985744")
    private Long endTime;

    @Schema(title = "The creator of this record", example = "tom")
    @CreatedBy
    private String creator;

    @Schema(title = "The modifier of this record", example = "tom")
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record create time", example = "1612198922000")
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", example = "1612198444000")
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
    
    @Schema(title = "status page components")
    @ManyToMany(targetEntity = StatusPageComponent.class, cascade = CascadeType.MERGE, fetch = FetchType.EAGER)
    @JoinTable(name = "hzb_status_page_incident_component_bind",
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
            inverseForeignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
            joinColumns = {@JoinColumn(name = "incident_id", referencedColumnName = "id")},
            inverseJoinColumns = {@JoinColumn(name = "component_id", referencedColumnName = "id")})
    private List<StatusPageComponent> components;
    
    @Schema(title = "status page incident content")
    @OneToMany(targetEntity = StatusPageIncidentContent.class, cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "incident_id", referencedColumnName = "id")
    private Set<StatusPageIncidentContent> contents;
}
