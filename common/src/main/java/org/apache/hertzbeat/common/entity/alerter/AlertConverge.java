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

package org.apache.hertzbeat.common.entity.alerter;

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
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.JsonByteListAttributeConverter;
import org.apache.hertzbeat.common.entity.manager.JsonTagListAttributeConverter;
import org.apache.hertzbeat.common.entity.manager.TagItem;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Alert Converge strategy entity
 */
@Entity
@Table(name = "hzb_alert_converge")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alert Converge Policy Entity")
@EntityListeners(AuditingEntityListener.class)
public class AlertConverge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Alert Converge Policy Entity Primary Key Index ID",
            description = "Alert Converge Policy Entity Primary Key Index ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Policy name", description = "Policy name",
            example = "converge-1", accessMode = READ_WRITE)
    @Size(max = 100)
    @NotNull
    private String name;

    @Schema(title = "Whether to enable this policy", description = "Whether to enable this policy",
            example = "true", accessMode = READ_WRITE)
    private boolean enable = true;
    
    @Schema(title = "Whether to match all", description = "Whether to match all",
            example = "true", accessMode = READ_WRITE)
    private boolean matchAll = true;

    @Schema(title = "Alarm Level "
            + "0:High-Emergency-Critical Alarm "
            + "1:Medium-Critical-Critical Alarm "
            + "2:Low-Warning-Warning",
            example = "[1]", accessMode = READ_WRITE)
    @Convert(converter = JsonByteListAttributeConverter.class)
    private List<Byte> priorities;

    @Schema(description = "Match the alarm information label(monitorId:xxx,monitorName:xxx)", example = "{name: key1, value: value1}",
            accessMode = READ_WRITE)
    @Convert(converter = JsonTagListAttributeConverter.class)
    @Column(length = 2048)
    private List<TagItem> tags;
    
    @Schema(title = "Repeat Alert Converge Time Range, unit s", example = "600", accessMode = READ_WRITE)
    @Min(0)
    private Integer evalInterval;

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "This record creation time (millisecond timestamp)", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
