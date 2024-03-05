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

package org.dromara.hertzbeat.common.entity.warehouse;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import jakarta.persistence.*;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * metrics history data entity
 * @author tom
 */
@Entity
@Table(name = "hzb_history", indexes = {
        @Index(name = "history_query_index", columnList = "monitorId"),
        @Index(name = "history_query_index", columnList = "app"),
        @Index(name = "history_query_index", columnList = "metrics"),
        @Index(name = "history_query_index", columnList = "metric")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Metrics History Data Entity | 指标数据历史实体")
public class History {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY, generator = "myid")
    @GenericGenerator(name = "myid", strategy = "org.dromara.hertzbeat.common.util.SnowFlakeIdGenerator")
    @Schema(description = "指标数据历史实体主键索引ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Monitoring Id", example = "87432674336", accessMode = READ_WRITE)
    private Long monitorId;

    @Schema(title = "Monitoring Type mysql oracle db2")
    private String app;

    @Schema(title = "Monitoring Metrics innodb disk cpu")
    private String metrics;

    @Schema(title = "Monitoring Metric usage speed count")
    private String metric;
    
    @Column(length = 5000)
    private String instance;

    @Schema(title = "Metric Type 0: Number 1：String")
    private Byte metricType;

    @Schema(title = "Metric String Value")
    @Column(length = 2048)
    private String str;

    @Schema(title = "Metric Integer Value")
    private Integer int32;

    @Schema(title = "Metric Number Value")
    private Double dou;

    @Schema(title = "Collect Time")
    private Long time;

}
