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

package org.apache.hertzbeat.ai.agent.pojo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * OpenAI Configuration DTO - simplified to handle only API key
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "OpenAI configuration")
public class OpenAiConfigDto {

    /**
     * Whether to enable OpenAI, default is false
     */
    @Schema(title = "Enable OpenAI", description = "Whether OpenAI is enabled", example = "true")
    private boolean enable = false;

    /**
     * OpenAI API key
     */
    @Schema(title = "API Key", description = "OpenAI API key", example = "sk-...")
    @NotBlank(message = "API Key cannot be empty when enabled")
    private String apiKey;
}