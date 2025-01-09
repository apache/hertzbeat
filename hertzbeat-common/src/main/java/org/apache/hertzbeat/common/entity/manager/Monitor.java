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
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.alerter.JsonMapAttributeConverter;
import org.apache.hertzbeat.common.support.valid.HostValid;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Monitor Entity
 */
@Entity
@Table(name = "hzb_monitor", indexes = {
        @Index(name = "monitor_query_index", columnList = "app"),
        @Index(name = "monitor_query_index", columnList = "host"),
        @Index(name = "monitor_query_index", columnList = "name")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Monitor Entity")
@EntityListeners(AuditingEntityListener.class)
public class Monitor {
    
    @Id
    @Schema(title = "Monitor task ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;
    
    @Schema(title = "Collect task ID", example = "43243543543", accessMode = READ_ONLY)
    private Long jobId;
    
    @Schema(title = "task name", example = "Api-TanCloud.cn", accessMode = READ_WRITE)
    @Size(max = 100)
    private String name;
    
    @Schema(title = "Type of monitoring", example = "TanCloud", accessMode = READ_WRITE)
    @Size(max = 100)
    private String app;
    
    @Schema(title = "peer host: ipv4, ipv6, domain name", example = "192.167.25.11", accessMode = READ_WRITE)
    @Size(max = 100)
    @HostValid
    private String host;
    
    @Schema(title = "Monitoring of the acquisition interval time in seconds", example = "600", accessMode = READ_WRITE)
    @Min(10)
    private Integer intervals;
    
    @Schema(title = "Task status 0: Paused, 1: Up, 2: Down", accessMode = READ_WRITE)
    @Min(0)
    @Max(4)
    private byte status;
    
    @Schema(title = "task label", example = "{env:test}", accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 4096)
    private Map<String, String> labels;

    @Schema(title = "task annotations", example = "{summary:this task looks good}", accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 4096)
    private Map<String, String> annotations;
    
    @Schema(title = "Monitor note description", example = "Availability monitoring of the SAAS website TanCloud", accessMode = READ_WRITE)
    @Size(max = 255)
    private String description;
    
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

    @Override
    public Monitor clone() {
        return JsonUtil.fromJson(JsonUtil.toJson(this), getClass());
    }
}
