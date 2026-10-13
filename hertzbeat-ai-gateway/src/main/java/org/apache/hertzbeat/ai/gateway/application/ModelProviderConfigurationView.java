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

package org.apache.hertzbeat.ai.gateway.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Secret-free provider configuration state returned to Gateway channels.
 *
 * @param activeProviderUid active saved configuration UID; null selects the YAML default
 * @param providers saved provider configurations without API keys
 */
@Schema(description = "Saved LLM provider configurations and active selection")
public record ModelProviderConfigurationView(
        String activeProviderUid,
        List<Provider> providers) {

    public ModelProviderConfigurationView {
        providers = List.copyOf(providers);
    }

    /**
     * One secret-free saved provider configuration.
     *
     * @param uid stable saved configuration identifier
     * @param type runtime provider implementation type
     * @param code provider preset code
     * @param baseUrl provider API endpoint
     * @param model model identifier
     * @param apiKeyConfigured whether a secret is persisted
     */
    @Schema(description = "Saved LLM provider configuration without its API key")
    public record Provider(
            String uid,
            String type,
            String code,
            String baseUrl,
            String model,
            boolean apiKeyConfigured) {
    }
}
