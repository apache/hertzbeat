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

package org.apache.hertzbeat.ai.provider;

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.support.ModelProviderConfigurationService;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** Saved selections take precedence; only an absent selection permits YAML fallback. */
@Component
public class EffectiveModelProviderResolver {
    private final ModelProviderConfigurationService configurations;
    private final Environment environment;

    public EffectiveModelProviderResolver(
            ModelProviderConfigurationService configurations, Environment environment) {
        this.configurations = configurations;
        this.environment = environment;
    }

    public ModelProviderConfig resolve() {
        ModelProviderConfig saved = configurations.getActiveConfiguration();
        return saved == null ? yaml() : saved;
    }

    public ModelProviderConfig yaml() {
        ModelProviderConfig yaml =
                Binder.get(environment)
                        .bind("hertzbeat.agent.provider", ModelProviderConfig.class)
                        .orElse(null);
        if (yaml == null
                || (!StringUtils.hasText(yaml.getBaseUrl())
                        && !StringUtils.hasText(yaml.getModel())
                        && !StringUtils.hasText(yaml.getApiKey())
                        && !StringUtils.hasText(yaml.getCode())
                        && !StringUtils.hasText(yaml.getProtocol()))) {
            return null;
        }
        if (!StringUtils.hasText(yaml.getType())) {
            yaml.setType(
                    StringUtils.hasText(yaml.getProtocol()) ? "protocol" : "openai-compatible");
        }
        if (!StringUtils.hasText(yaml.getName())) {
            yaml.setName("YAML default");
        }
        return yaml;
    }
}
