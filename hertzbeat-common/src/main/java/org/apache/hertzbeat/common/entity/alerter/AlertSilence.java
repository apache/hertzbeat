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

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.JsonByteListAttributeConverter;
import org.apache.hertzbeat.common.entity.manager.ZonedDateTimeAttributeConverter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Alert Silence strategy entity
 */
@Entity
@Table(name = "hzb_alert_silence")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alert Silence Policy Entity")
@EntityListeners(AuditingEntityListener.class)
public class AlertSilence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Primary Key Index ID",
            example = "87584674384")
    private Long id;

    @Schema(title = "Policy name", example = "silence-1")
    @Size(max = 100)
    @NotNull
    private String name;

    @Schema(title = "Whether to enable this policy", example = "true")
    private boolean enable = true;
    
    @Schema(title = "Whether to match all", example = "true")
    private boolean matchAll = true;

    @Schema(title = "Silence type 0: once, 1:cyc", example = "1")
    @NotNull
    private Byte type;

    @Schema(title = "Silenced alerts num", example = "3")
    private Integer times;

    @Schema(description = "Match the alarm information label", example = "{name: key1, value: value1}")
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 2048)
    private Map<String, String> labels;

    @Schema(title = "The day of the WEEK is valid in periodic silence, multiple,"
            + " all or empty is daily 7: Sunday 1: Monday 2: Tuesday 3: Wednesday 4: Thursday 5: Friday 6: Saturday",
            example = "[0,1]")
    @Convert(converter = JsonByteListAttributeConverter.class)
    private List<Byte> days;

    @Schema(title = "Limit time period start", example = "00:00:00")
    @Convert(converter = ZonedDateTimeAttributeConverter.class)
    private ZonedDateTime periodStart;

    @Schema(title = "Restricted time period end", example = "23:59:59")
    @Convert(converter = ZonedDateTimeAttributeConverter.class)
    private ZonedDateTime periodEnd;

    @Schema(title = "The creator of this record", example = "tom")
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by", example = "tom")
    @LastModifiedBy
    private String modifier;

    @Schema(title = "This record creation time (millisecond timestamp)")
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)")
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
