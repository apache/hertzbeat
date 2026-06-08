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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * User-scoped dashboard panel draft for signal explorer queries.
 */
@Entity
@Table(name = "hzb_signal_dashboard_panel_draft",
        uniqueConstraints = @UniqueConstraint(columnNames = {"creator", "signal", "draft_key"}))
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SignalDashboardPanelDraftEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 255)
    @Column(name = "creator", nullable = false)
    private String creator;

    @NotBlank
    @Size(max = 32)
    @Column(name = "signal", nullable = false)
    private String signal;

    @NotBlank
    @Size(max = 128)
    @Column(name = "draft_key", nullable = false)
    private String draftKey;

    @NotBlank
    @Size(max = 255)
    @Column(name = "title", nullable = false)
    private String title;

    @Size(max = 512)
    @Column(name = "description")
    private String description;

    @NotBlank
    @Size(max = 32)
    @Column(name = "visualization", nullable = false)
    private String visualization;

    @NotBlank
    @Size(max = 2048)
    @Column(name = "route", nullable = false, length = 2048)
    private String route;

    @Lob
    @Column(name = "query_snapshot", columnDefinition = "TEXT")
    private String querySnapshot;

    @Lob
    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    @Column(name = "create_time")
    private LocalDateTime createTime;

    @Column(name = "update_time")
    private LocalDateTime updateTime;
}
