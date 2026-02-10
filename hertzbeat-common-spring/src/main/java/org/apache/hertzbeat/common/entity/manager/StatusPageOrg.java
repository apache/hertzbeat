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
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
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
 * status page org entity
 */
@Entity
@Table(name = "hzb_status_page_org")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "status page org entity")
@EntityListeners(AuditingEntityListener.class)
public class StatusPageOrg {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "ID", example = "87584674384")
    private Long id;
    
    @Schema(title = "org name", example = "TanCloud")
    @NotBlank
    private String name;

    @Schema(title = "org desc", example = "TanCloud inc")
    @NotBlank
    private String description;

    @Schema(title = "org home url", example = "https://tancloud.com")
    @NotBlank
    private String home;
    
    @Schema(title = "org logo url", example = "logo.svg url")
    @NotBlank
    private String logo;

    @Schema(title = "org feedback issue url", example = "contact@email.com")
    private String feedback;
    
    @Schema(title = "org theme background color", example = "#ffffff")
    private String color;

    @Schema(title = "org current state: 0-All Systems Operational 1-Some Systems Abnormal 2-All Systems Abnormal ",
            example = "0")
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
