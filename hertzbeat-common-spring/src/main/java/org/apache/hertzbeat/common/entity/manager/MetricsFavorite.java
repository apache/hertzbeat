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
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;

/**
 * Metrics Favorite Entity
 */
@Entity
@Table(name = "hzb_metrics_favorite", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"creator", "monitor_id", "metrics_name"}))
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MetricsFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Creator cannot be null or blank")
    @Size(max = 255, message = "Creator length cannot exceed 255 characters")
    @Column(name = "creator", nullable = false)
    private String creator;

    @NotNull(message = "Monitor ID cannot be null")
    @Column(name = "monitor_id", nullable = false)
    private Long monitorId;

    @NotBlank(message = "Metrics name cannot be null or blank")
    @Size(max = 255, message = "Metrics name length cannot exceed 255 characters")
    @Column(name = "metrics_name", nullable = false)
    private String metricsName;

    @CreatedDate
    @Column(name = "create_time", updatable = false)
    private LocalDateTime createTime;
}