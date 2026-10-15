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

package org.apache.hertzbeat.ai.gateway.runtime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Agent model provider configuration fallback.
 */
@Getter
@Setter
@ToString
@ConfigurationProperties(prefix = AgentProviderProperties.PREFIX)
public class AgentProviderProperties {

    public static final String PREFIX = "hertzbeat.agent.provider";

    private String type = "openai-compatible";

    private String code = "";

    private String model = "";

    private String baseUrl = "";

    @ToString.Exclude
    private String apiKey = "";

    public void setType(String type) {
        // Empty properties may bind as null and environment values may be padded; canonicalize both here.
        this.type = type == null ? "" : type.trim();
    }

    public void setCode(String code) {
        // Empty properties may bind as null and environment values may be padded; canonicalize both here.
        this.code = code == null ? "" : code.trim();
    }

    public void setModel(String model) {
        // Empty properties may bind as null and environment values may be padded; canonicalize both here.
        this.model = model == null ? "" : model.trim();
    }

    public void setBaseUrl(String baseUrl) {
        // Empty properties may bind as null and environment values may be padded; canonicalize both here.
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
    }

    public void setApiKey(String apiKey) {
        // Empty properties may bind as null and environment values may be padded; canonicalize both here.
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }
}
