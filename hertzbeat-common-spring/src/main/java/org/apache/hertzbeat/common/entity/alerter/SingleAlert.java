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
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
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
 * Single Alert Content Entity
 */
@Entity
@Table(name = "hzb_alert_single", indexes = {@Index(name = "unique_fingerprint", columnList = "fingerprint", unique = true)})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Single Alarm Content Entity")
@EntityListeners(AuditingEntityListener.class)
public class SingleAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Threshold Id", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Fingerprint", example = "alertname:demo")
    @Column(length = 2048)
    private String fingerprint;
    
    @Schema(title = "Labels", example = "{\"alertname\": \"HighCPUUsage\", \"priority\": \"critical\", \"instance\": \"343483943\"}")
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 2048)
    private Map<String, String> labels;

    @Schema(title = "Annotations", example = "{\"summary\": \"High CPU usage detected\"}")
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 4096)
    private Map<String, String> annotations;

    @Schema(title = "Content", example = "CPU usage is above 80% for the last 5 minutes on instance server1.example.com.")
    @Column(length = 4096)
    private String content;

    @Schema(title = "Status", example = "firing|resolved")
    private String status;

    @Schema(title = "Trigger Times", example = "1")
    private Integer triggerTimes;

    @Schema(title = "Start At", example = "1734005477630")
    private Long startAt;

    @Schema(title = "Active At", example = "1734005477630")
    private Long activeAt;

    @Schema(title = "End At, when status is resolved has", example = "null")
    private Long endAt;

    @Schema(title = "The creator of this record", example = "tom")
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by", example = "tom")
    @LastModifiedBy
    private String modifier;

    @Schema(title = "This record creation time (millisecond timestamp)")
    @CreatedDate
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)")
    @LastModifiedDate
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime gmtUpdate;

    @Override
    public SingleAlert clone() {
        // deep clone
        return JsonUtil.fromJson(JsonUtil.toJson(this), SingleAlert.class);
    }
}
