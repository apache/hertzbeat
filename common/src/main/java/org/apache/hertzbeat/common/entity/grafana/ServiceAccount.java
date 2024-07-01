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




/**
 * Grafana service account entity
 */
@Entity
@Table(name = "hzb_grafana_service_account")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Grafana service account entity")
public class ServiceAccount {
    @Id
    @Schema(description = "Service account id")
    private Long id;
    @Schema(description = "Service account name")
    private String name;
    @Schema(description = "Service account role")
    private String role;
    @Schema(description = "Service account is disabled")
    private Boolean isDisabled;
    @Schema(description = "Service account tokens")
    private Integer tokens;
    @Schema(description = "Service account avatar url")
    private String avatarUrl;
    @Schema(description = "Service account login")
    private String login;
    @Schema(description = "Service account orgId")
    private Integer orgId;

}
