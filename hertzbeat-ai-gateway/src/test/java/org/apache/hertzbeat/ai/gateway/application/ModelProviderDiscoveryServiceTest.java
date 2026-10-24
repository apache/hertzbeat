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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.provider.ModelCatalogService;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.manager.service.ModelProviderConfigurationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

@ExtendWith(MockitoExtension.class)
class ModelProviderDiscoveryServiceTest {
    @Mock private ModelProviderConfigurationService configurations;
    @Mock private ModelCatalogService catalog;
    private ModelProviderConfig saved;

    @BeforeEach
    void prepare() {
        saved = new ModelProviderConfig();
        saved.setUid("legacy-custom");
        saved.setType("openai-compatible");
        saved.setCode("custom");
        saved.setBaseUrl("https://example.invalid/v1");
        saved.setApiKey("saved-test-key");
        saved.setHeaders(Map.of("X-Project", "saved-test-header"));
        when(configurations.getConfiguration(saved.getUid())).thenReturn(saved);
        when(catalog.list(any()))
                .thenReturn(new ModelCatalogService.Result("ready", List.of(), false));
    }

    @Test
    void legacyCustomDraftReusesRedactedCredentialsWithoutChangingStoredConfiguration() {
        ModelProviderConfig draft = draft();
        draft.setProtocol("openai-chat");
        draft.setAuthMode("default");
        draft.setBaseUrl(saved.getBaseUrl() + "/chat/completions/");
        draft.setHeaders(Map.of("X-Project", ""));
        new ModelProviderDiscoveryService(configurations, catalog).discover(draft);
        ModelProviderConfig request = request();
        assertEquals(saved.getApiKey(), request.getApiKey());
        assertEquals(saved.getHeaders(), request.getHeaders());
        assertEquals(saved.getUid(), request.getUid());
        assertEquals("openai-compatible", request.getType());
        assertEquals("custom", request.getCode());
        assertNull(draft.getApiKey());
        assertEquals(Map.of("X-Project", ""), draft.getHeaders());
        verifyNoMoreInteractions(configurations);
    }

    @ParameterizedTest
    @ValueSource(strings = {"url", "protocol", "authentication", "type", "code"})
    void changedDestinationNeverReceivesSavedSecrets(String field) {
        ModelProviderConfig draft = draft();
        switch (field) {
            case "url" -> draft.setBaseUrl("https://other.invalid/v1");
            case "protocol" -> draft.setProtocol("openai-responses");
            case "authentication" -> draft.setAuthMode("custom-header");
            case "type" -> draft.setType("protocol");
            case "code" -> draft.setCode("openai-chat");
            default -> throw new IllegalArgumentException(field);
        }
        new ModelProviderDiscoveryService(configurations, catalog).discover(draft);
        assertNull(request().getApiKey());
        verifyNoMoreInteractions(configurations);
    }

    @Test
    void newBlankHeaderKeepsItsSubmittedValue() {
        ModelProviderConfig draft = draft();
        draft.setProtocol("openai-chat");
        draft.setAuthMode("default");
        draft.setBaseUrl(saved.getBaseUrl() + "/chat/completions/");
        draft.setHeaders(new java.util.LinkedHashMap<>(java.util.Map.of("X-Project", "", "X-New", "")));
        new ModelProviderDiscoveryService(configurations, catalog).discover(draft);
        java.util.Map<String, String> headers = request().getHeaders();
        assertEquals("saved-test-header", headers.get("X-Project"));
        assertEquals("", headers.get("X-New"));
        assertNull(headers.get("X-Absent"));
    }

    @Test
    void explicitlyEnteredReplacementCredentialTakesPrecedence() {
        ModelProviderConfig draft = draft();
        draft.setApiKey("replacement-test-key");
        new ModelProviderDiscoveryService(configurations, catalog).discover(draft);
        assertEquals("replacement-test-key", request().getApiKey());
    }

    private ModelProviderConfig draft() {
        ModelProviderConfig draft = saved.copy();
        draft.setApiKey(null);
        draft.setHeaders(null);
        return draft;
    }

    private ModelProviderConfig request() {
        ArgumentCaptor<ModelProviderConfig> capture =
                ArgumentCaptor.forClass(ModelProviderConfig.class);
        verify(catalog).list(capture.capture());
        verify(configurations).getConfiguration(saved.getUid());
        return capture.getValue();
    }
}
