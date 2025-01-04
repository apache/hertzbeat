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

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
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
 * status page component entity
 */
@Entity
@Table(name = "hzb_status_page_component")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "status page component entity")
@EntityListeners(AuditingEntityListener.class)
public class StatusPageComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "ID", example = "87584674384")
    private Long id;
    
    @Schema(title = "org id", example = "1234")
    private Long orgId;

    @Schema(title = "component name", example = "Gateway")
    @NotBlank
    private String name;

    @Schema(title = "component desc", example = "TanCloud Gateway")
    private String description;

    @Schema(title = "component label", example = "{env:test}", accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 4096)
    private Map<String, String> labels;

    @Schema(title = "calculate status method: 0-auto 1-manual", example = "0")
    private byte method;

    @Schema(title = "config state when use manual method: 0-Normal 1-Abnormal 2-unknown", example = "0")
    private byte configState;
    
    @Schema(title = "component current state: 0-Normal 1-Abnormal 2-unknown", example = "0")
    private byte state;

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
}
