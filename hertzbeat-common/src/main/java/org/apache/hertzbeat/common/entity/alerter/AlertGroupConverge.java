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
import java.util.List;
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
 * Alert group converge strategy entity
 */
@Entity
@Table(name = "hzb_alert_group_converge")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alert Group Converge Policy Entity")
@EntityListeners(AuditingEntityListener.class)
public class AlertGroupConverge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Primary Key Index ID", example = "87584674384")
    private Long id;

    @Schema(title = "Policy name", example = "group-converge-1")
    @Size(max = 100)
    @NotNull
    private String name;
    
    @Schema(title = "Labels to group by", example = "[\"instance\"]")
    @Convert(converter = JsonStringListAttributeConverter.class)
    @Column(name = "group_labels", length = 1024)
    private List<String> groupLabels;
    
    @Schema(title = "Initial wait time before sending first group alert (s)", example = "30")
    @Column(name = "group_wait")
    private Long groupWait;
    
    @Schema(title = "Interval between group alert sends (s)", example = "300")
    @Column(name = "group_interval")
    private Long groupInterval;
    
    @Schema(title = "Interval for repeating firing alerts (s), set to 0 to disable repeating", example = "9000")
    @Column(name = "repeat_interval")
    private Long repeatInterval;

    @Schema(title = "Whether to enable this policy", example = "true")
    private Boolean enable;

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
