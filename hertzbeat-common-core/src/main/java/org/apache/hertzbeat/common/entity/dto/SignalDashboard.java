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

package org.apache.hertzbeat.common.entity.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.JsonNode;

/**
 * Server-backed Perses document, native revision, and legacy fields retained for export.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalDashboard {

    private Long id;

    @NotBlank
    @Size(max = 128)
    private String dashboardKey;

    @Size(max = 255)
    private String title;

    @Size(max = 512)
    private String description;

    @Size(max = 512)
    private String tags;

    private String layout;

    private String widgets;

    private String variables;

    private String panelMap;

    @Size(max = 32)
    private String version;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    private JsonNode document;

    @PositiveOrZero
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private Long revision;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
