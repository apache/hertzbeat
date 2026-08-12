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

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Per-user presentation layout for one monitor application.
 */
@Entity
@Table(name = "hzb_monitor_metric_layout",
        uniqueConstraints = @UniqueConstraint(columnNames = {"creator", "application"}))
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MonitorMetricLayoutEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "creator", nullable = false, length = 255)
    private String creator;

    @Column(name = "application", nullable = false, length = 128)
    private String application;

    @Column(name = "schema_version", nullable = false)
    private Integer schemaVersion;

    @Lob
    @Column(name = "layout_document", nullable = false, columnDefinition = "TEXT")
    private String layoutDocument;

    @Column(name = "revision", nullable = false, length = 64)
    private String revision;

    @Column(name = "create_time", nullable = false)
    private LocalDateTime createTime;

    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;
}
