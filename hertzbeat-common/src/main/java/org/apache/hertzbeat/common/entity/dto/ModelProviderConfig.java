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

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Model Provider Configuration
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "LLM Model Provider configuration")
public class ModelProviderConfig {
    
    @Schema(title = "Enable Provider", description = "Whether Provider is enabled", example = "true")
    private boolean enable = false;
    
    @Schema(title = "Check the provider available status")
    private boolean status = false;
    
    @Schema(title = "The error message when provider status check failed")
    private String error;
    
    @Schema(title = "Model type, text-generate, vision")
    private String type;
    
    @Schema(title = "Model Provider code, like openai, zai, bigmodel")
    private String code;
    
    @Schema(title = "custom the provider server base url")
    private String baseUrl;
    
    @Schema(title = "use the model id name, eg: gpt-5, glm-4.6")
    private String model;
    
    @Schema(title = "API Key", description = "API key", example = "sk-...")
    @NotBlank(message = "API Key cannot be empty when enabled")
    private String apiKey;
}