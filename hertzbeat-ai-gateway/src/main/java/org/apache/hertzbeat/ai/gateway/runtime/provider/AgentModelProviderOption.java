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

package org.apache.hertzbeat.ai.gateway.runtime.provider;

import java.util.List;

/**
 * User-selectable configuration preset exposed by an Agent model provider.
 *
 * @param type provider implementation type
 * @param code provider-specific preset code
 * @param label user-facing preset name
 * @param defaultBaseUrl default endpoint, or {@code null} when it must be supplied
 * @param defaultModel default model, or {@code null} when it must be supplied
 * @param requiredFields configuration fields required by this preset
 */
public record AgentModelProviderOption(
        String type,
        String code,
        String label,
        String defaultBaseUrl,
        String defaultModel,
        List<String> requiredFields) {

    public AgentModelProviderOption {
        // Required fields are extension-owned metadata; snapshot them at the provider registration boundary.
        requiredFields = List.copyOf(requiredFields);
    }
}
