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

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.JsonStringListAttributeConverter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Policy that groups persisted single alerts before automatic analysis. */
@Data
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "hzb_alert_analysis_policy")
@AllArgsConstructor
@NoArgsConstructor
public class AlertAnalysisPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = true;

    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(name = "match_labels", nullable = false, length = 4096)
    private Map<String, String> matchLabels;

    @Convert(converter = JsonStringListAttributeConverter.class)
    @Column(name = "group_by_labels", nullable = false, length = 2048)
    private List<String> groupByLabels;

    @Column(name = "window_seconds", nullable = false)
    private long windowSeconds;

    @Column(name = "minimum_alert_count", nullable = false)
    private int minimumAlertCount;

    @Column(name = "cooldown_seconds", nullable = false)
    private long cooldownSeconds;

    @CreatedDate
    @Column(name = "gmt_create")
    private LocalDateTime gmtCreate;

    @LastModifiedDate
    @Column(name = "gmt_update")
    private LocalDateTime gmtUpdate;
}
