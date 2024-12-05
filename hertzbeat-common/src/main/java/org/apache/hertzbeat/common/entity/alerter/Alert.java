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
import jakarta.persistence.Transient;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Alarm record entity
 */
@Entity
@Table(name = "hzb_alert")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alarm record entity")
@EntityListeners(AuditingEntityListener.class)
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Alarm record entity primary key index ID",
            description = "Alarm record entity primary key index ID",
            example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Alert target object: monitor availability-available metrics-app.metrics.field",
            description = "Alert target object: monitor availability-available metrics-app.metrics.field",
            example = "1", accessMode = READ_WRITE)
    @Size(max = 255)
    private String target;

    @Schema(title = "Alarm definition ID associated with the alarm",
            description = "Alarm definition ID associated with the alarm",
            example = "8743267443543", accessMode = READ_WRITE)
    private Long alertDefineId;

    @Schema(title = "Alarm level 0:High-Emergency-Critical Alarm 1:Medium-Critical-Critical Alarm 2:Low-Warning-Warning", 
            example = "1", accessMode = READ_WRITE)
    @Min(0)
    @Max(2)
    private byte priority;

    @Schema(title = "The actual content of the alarm notification",
            description = "The actual content of the alarm notification",
            example = "linux_192.134.32.1: 534543534 cpu usage high",
            accessMode = READ_WRITE)
    @Column(length = 4096)
    private String content;

    @Schema(title = "Alarm status: "
            + "0-normal alarm (to be processed) "
            + "1-threshold triggered but not reached the number of alarms "
            + "2-recovered alarm "
            + "3-processed",
            description = "Alarm status: "
                    + "0-normal alarm (to be processed) "
                    + "1-threshold triggered but not reached the number of alarms "
                    + "2-recovered alarm "
                    + "3-processed",
            example = "1", accessMode = READ_WRITE)
    @Min(0)
    @Max(3)
    private byte status;
    
    @Schema(title = "Alarm times",
            description = "Alarm times",
            example = "3", accessMode = READ_WRITE)
    private Integer times;
    
    @Schema(title = "Alarm trigger time (timestamp in milliseconds)",
            description = "Alarm trigger time (timestamp in milliseconds)",
            example = "1612198922000", accessMode = READ_ONLY)
    private Long firstAlarmTime;
    
    @Schema(title = "Alarm trigger time (timestamp in milliseconds)",
            description = "Alarm trigger time (timestamp in milliseconds)",
            example = "1612198922000", accessMode = READ_ONLY)
    private Long lastAlarmTime;

    @Schema(title = "Alarm threshold trigger times",
            description = "Alarm threshold trigger times",
            example = "3", accessMode = READ_WRITE)
    @Transient
    private Integer triggerTimes;

    @Schema(description = "Alarm information label(monitorId:xxx,monitorName:xxx)",
            example = "{key1:value1}", accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    @SuppressWarnings("JpaAttributeTypeInspection")
    @Column(length = 2048)
    private Map<String, String> tags;

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "The modifier of this record", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record the latest creation time (timestamp in milliseconds)",
            description = "Record the latest creation time (timestamp in milliseconds)",
            example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

    @Override
    public Alert clone() {
        // deep clone
        return JsonUtil.fromJson(JsonUtil.toJson(this), Alert.class);
    }
}
