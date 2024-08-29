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
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Monitor parameter values
 */
@Entity
@Table(name = "hzb_param", indexes = { @Index(columnList = "monitorId") },
        uniqueConstraints = @UniqueConstraint(columnNames = {"monitorId", "field"}))
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Parameter Entity")
@EntityListeners(AuditingEntityListener.class)
public class Param {

    /**
     * Parameter primary key index ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Parameter primary key index ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    /**
     * Monitor ID
     */
    @Schema(title = "Monitor task ID", example = "875846754543", accessMode = READ_WRITE)
    private Long monitorId;

    /**
     * Parameter Field Identifier
     */
    @Schema(title = "Parameter identifier field", example = "port", accessMode = READ_WRITE)
    @Size(max = 100)
    @NotBlank(message = "field can not null")
    private String field;

    /**
     * Param Value
     */
    @Schema(title = "parameter values", example = "8080", accessMode = READ_WRITE)
    @Size(max = 8126)
    @Column(length = 8126)
    private String paramValue;

    /**
     * Parameter type 0: number 1: string 2: encrypted string 3: json string mapped by map
     */
    @Schema(title = "Parameter types 0: number 1: string 2: encrypted string 3:map mapped json string 4:arrays string",
            accessMode = READ_WRITE)
    @Min(0)
    private byte type;

    /**
     * Record create time
     */
    @Schema(title = "Record create time", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    /**
     * Record the latest modification time
     */
    @Schema(title = "Record modify time", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

}
