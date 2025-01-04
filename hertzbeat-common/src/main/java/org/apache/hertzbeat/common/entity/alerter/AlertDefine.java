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
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Map;
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
 * Alarm Define Rule Entity
 */
@Entity
@Table(name = "hzb_alert_define")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alarm Threshold Entity")
@EntityListeners(AuditingEntityListener.class)
public class AlertDefine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Threshold Id", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Alert Rule Name", example = "high_cpu_usage", accessMode = READ_WRITE)
    @Size(max = 100)
    @NotNull
    private String name;

    @Schema(title = "Rule Type: realtime, periodic", example = "0")
    private String type;

    @Schema(title = "Alarm Threshold Expr", example = "usage>90", accessMode = READ_WRITE)
    @Size(max = 2048)
    @Column(length = 2048)
    private String expr;

    @Schema(title = "Execution Period (seconds) - For periodic rules", example = "300")
    private Integer period;
    
    @Schema(title = "Alarm Trigger Times.The alarm is triggered only after the required number of times is reached",
            example = "3", accessMode = READ_WRITE)
    private Integer times;
    
    @Schema(description = "labels(status:success,env:prod,priority:critical)", example = "{name: key1, value: value1}",
            accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 2048)
    private Map<String, String> labels;

    @Schema(title = "Annotations", example = "summary: High CPU usage")
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 4096)
    private Map<String, String> annotations;

    @Schema(title = "Alert Content Template", example = "Instance {{ $labels.instance }} CPU usage is {{ $value }}%")
    @Size(max = 2048)
    @Column(length = 2048)
    private String template;

    @Schema(title = "Data Source Type", example = "PROMETHEUS")
    @Size(max = 100)
    private String datasource;

    @Schema(title = "Is Enabled", example = "true")
    private boolean enable = true;

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "The modifier of this record", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record create time", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
