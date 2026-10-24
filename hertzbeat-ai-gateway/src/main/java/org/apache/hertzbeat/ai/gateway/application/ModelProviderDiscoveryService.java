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

import org.apache.hertzbeat.ai.provider.ModelCatalogService;
import org.apache.hertzbeat.ai.provider.ModelConnection;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.manager.service.ModelProviderConfigurationService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Objects;

/** Resolves redacted saved credentials only for the same discovery destination. */
@Service
public class ModelProviderDiscoveryService {
    private final ModelProviderConfigurationService configurations;
    private final ModelCatalogService catalog;

    public ModelProviderDiscoveryService(
            ModelProviderConfigurationService configurations, ModelCatalogService catalog) {
        this.configurations = configurations;
        this.catalog = catalog;
    }

    public ModelCatalogService.Result discover(ModelProviderConfig input) {
        ModelProviderConfig draft = input.copy();
        if (StringUtils.hasText(draft.getUid())) {
            ModelProviderConfig saved = configurations.getConfiguration(draft.getUid());
            if (sameDestination(saved, draft)) {
                if (!StringUtils.hasText(draft.getApiKey())) draft.setApiKey(saved.getApiKey());
                if (draft.getHeaders() == null) draft.setHeaders(saved.getHeaders());
                else
                    draft.getHeaders()
                            .replaceAll(
                                    (name, value) -> {
                                        if (StringUtils.hasText(value)
                                                || saved.getHeaders() == null) {
                                            return value;
                                        }
                                        // A blank value keeps the saved secret only when that
                                        // header already exists. A new blank entry has nothing to
                                        // preserve, so keep the submitted value instead of
                                        // substituting null.
                                        String preserved = saved.getHeaders().get(name);
                                        return preserved == null ? value : preserved;
                                    });
            }
        }
        return catalog.list(draft);
    }

    private boolean sameDestination(ModelProviderConfig saved, ModelProviderConfig draft) {
        try {
            return Objects.equals(saved.getType(), draft.getType())
                    && Objects.equals(saved.getCode(), draft.getCode())
                    && ModelConnection.protocol(saved).equals(ModelConnection.protocol(draft))
                    && ModelConnection.authMode(saved).equals(ModelConnection.authMode(draft))
                    && ModelConnection.endpoint(saved).equals(ModelConnection.endpoint(draft));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
