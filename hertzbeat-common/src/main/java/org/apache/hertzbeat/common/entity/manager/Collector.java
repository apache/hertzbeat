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
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Min;
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
 * collector entity
 */
@Entity
@Table(name = "hzb_collector", uniqueConstraints = @UniqueConstraint(columnNames = {"name"}))
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "slave collector entity")
@EntityListeners(AuditingEntityListener.class)
public class Collector {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "primary id", example = "2")
    private Long id;

    @Schema(title = "collector identity name", description = "collector identity name")
    @NotBlank(message = "name can not null")
    private String name;

    @Schema(title = "collector ip", description = "collector remote ip")
    @NotBlank(message = "ip can not null")
    private String ip;

    @Schema(title = "collector version", description = "collector version")
    private String version;

    @Schema(title = "collector status: 0-online 1-offline")
    @Min(0)
    private byte status;

    @Schema(title = "collector mode: public or private")
    private String mode;

    @Schema(title = "The creator of this record", example = "tom")
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by")
    @LastModifiedBy
    private String modifier;

    @Schema(title = "This record creation time (millisecond timestamp)")
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)")
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
