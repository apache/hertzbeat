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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * collector entity
 */
@Entity
@Table(name = "hzb_collector_monitor_bind", indexes = {
        @Index(name = "index_collector_monitor", columnList = "collector"),
        @Index(name = "index_collector_monitor", columnList = "monitor_id")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "slave collector monitor bind entity | 采集器与监控关联实体")
@EntityListeners(AuditingEntityListener.class)
public class CollectorMonitorBind {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "primary id", example = "23")
    private Long id;

    @Schema(title = "collector name", example = "87432674384")
    private String collector;

    @Schema(title = "monitor ID", example = "87432674336")
    @Column(name = "monitor_id")
    private Long monitorId;

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
