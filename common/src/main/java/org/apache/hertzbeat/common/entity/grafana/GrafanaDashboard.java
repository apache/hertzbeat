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
import jakarta.persistence.Transient;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Grafana dashboard entity
 */
@Entity
@Table(name = "hzb_grafana_dashboard")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Grafana dashboard entity")
public class GrafanaDashboard implements Serializable {

    @Id
    @Schema(description = "Monitor id")
    private Long monitorId;
    
    @Schema(description = "Dashboard folderUid")
    private String folderUid;
    
    @Schema(description = "Dashboard slug")
    private String slug;
    
    @Schema(description = "Dashboard status")
    private String status;
    
    @Schema(description = "Dashboard uid")
    private String uid;
    
    @Schema(description = "Dashboard url")
    private String url;
    
    @Schema(description = "Dashboard version")
    private Long version;
    
    @Schema(description = "is enabled")
    private boolean enabled;
    
    @Schema(description = "template")
    @Transient
    private String template;
}
