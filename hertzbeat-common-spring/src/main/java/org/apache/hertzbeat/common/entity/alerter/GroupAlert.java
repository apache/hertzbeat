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
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.JsonStringListAttributeConverter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Group Alert Content Entity
 */
@Entity
@Table(name = "hzb_alert_group", indexes = {@Index(name = "unique_group_key", columnList = "group_key", unique = true)})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Group Alarm Content Entity")
@EntityListeners(AuditingEntityListener.class)
public class GroupAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Threshold Id", example = "87584674384", accessMode = READ_ONLY)
    private Long id;
    
    @Schema(title = "Group Key", example = "HighCPUUsage{alertname=\"HighCPUUsage\", instance=\"server1\"}")
    @Column(length = 2048)
    private String groupKey;
    
    @Schema(title = "Status", example = "resolved")
    private String status;

    @Schema(title = "Group Labels", example = "{\"alertname\": \"HighCPUUsage\"}")
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 2048)
    private Map<String, String> groupLabels;

    @Schema(title = "Common Labels", example = "{\"alertname\": \"HighCPUUsage\", \"instance\": \"server1\", \"severity\": \"critical\"}")
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 2048)
    private Map<String, String> commonLabels;

    @Schema(title = "Common Annotations", example = "{\"summary\": \"High CPU usage detected\", \"description\": \"CPU usage is back to normal for server1\"}")
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private Map<String, String> commonAnnotations;
    
    @Schema(title = "Alert Fingerprints", example = "[\"dxsdfdsf\"]")
    @Convert(converter = JsonStringListAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> alertFingerprints;

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

    @Transient
    private List<SingleAlert> alerts;
}
