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

package org.apache.hertzbeat.common.entity.grafana;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

/**
 * Grafana dashboard entity
 * Grafana 仪表盘实体
 */
@Entity
@Table(name = "grafana_dashboard")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Grafana dashboard entity | Grafana 仪表盘实体")
public class Dashboard implements Serializable {
    @Id
    @Schema(description = "Dashboard id | 仪表盘id")
    private Long id;
    @Schema(description = "Dashboard folderUid | 仪表盘文件夹id")
    private String folderUid;
    @Schema(description = "Dashboard slug | 仪表盘slug")
    private String slug;
    @Schema(description = "Dashboard status | 仪表盘状态")
    private String status;
    @Schema(description = "Dashboard uid | 仪表盘uid")
    private String uid;
    @Schema(description = "Dashboard url | 仪表盘url")
    private String url;
    @Schema(description = "Dashboard version | 仪表盘版本")
    private Long version;
    @Schema(description = "Monitor id | 监控任务id")
    private Long monitorId;
}
