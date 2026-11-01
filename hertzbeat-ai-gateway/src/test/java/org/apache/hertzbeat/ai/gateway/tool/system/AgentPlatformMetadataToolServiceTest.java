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

package org.apache.hertzbeat.ai.gateway.tool.system;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfigState;
import org.apache.hertzbeat.common.entity.manager.AuthToken;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfigRequest;
import org.apache.hertzbeat.manager.service.AccountService;
import org.apache.hertzbeat.manager.service.ModelProviderConfigurationService;
import org.apache.hertzbeat.manager.service.PluginService;
import org.apache.hertzbeat.manager.service.SystemConfigService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

class AgentPlatformMetadataToolServiceTest {
    private final AccountService accounts = mock(AccountService.class);
    private final ModelProviderConfigurationService providers = mock(ModelProviderConfigurationService.class);
    private final AgentPlatformMetadataToolService service = new AgentPlatformMetadataToolService(
            mock(SystemConfigService.class), accounts, mock(PluginService.class), providers, mock(ObjectProvider.class));

    @Test
    void tokenMetadataNeverContainsRawOrMaskedCredentials() {
        AuthToken token = new AuthToken();
        token.setId(3L);
        token.setName("operations");
        token.setTokenMask("secret-mask-sentinel");
        when(accounts.listTokens()).thenReturn(List.of(token));
        String json = JsonUtil.toJson(service.tokens(null, null));
        assertTrue(json.contains("operations"));
        assertFalse(json.contains("secret-mask-sentinel"));
        assertFalse(json.contains("tokenMask"));
    }

    @Test
    void providerProjectionExcludesKeysAndCredentialBearingEndpoint() {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setUid("provider-a");
        config.setApiKey("secret-key-sentinel");
        config.setBaseUrl("https://user:password@example.test/?token=secret");
        ModelProviderConfigState state = new ModelProviderConfigState();
        state.setProviders(List.of(config));
        when(providers.getState()).thenReturn(state);
        String json = JsonUtil.toJson(service.providers());
        assertTrue(service.providers().providers().getFirst().apiKeyConfigured());
        assertFalse(json.contains("secret-key-sentinel"));
        assertFalse(json.contains("example.test"));
        assertFalse(json.contains("baseUrl"));
    }

    @Test
    void allMetadataToolsAreAdminOnly() {
        for (var method : AgentPlatformMetadataToolService.class.getDeclaredMethods()) {
            var policy = method.getAnnotation(AgentToolPolicy.class);
            if (policy != null) {
                assertEquals(AgentToolAccess.ADMIN, policy.access());
            }
        }
    }

    @Test
    void invalidRequestsAndAbsentDeploymentFailExplicitly() {
        assertThrows(IllegalArgumentException.class, () -> service.plugins(null, 0, 101));
        assertThrows(IllegalArgumentException.class, () -> service.operation(""));
        assertThrows(IllegalStateException.class, () -> service.operation("migration-a"));
        SystemConfigRequest request = new SystemConfigRequest();
        request.markUnknownField("password", "not-retained");
        assertThrows(IllegalArgumentException.class, () -> service.configUpdate(request));
    }

    @Test
    void tokenPagesAreBoundedAndReportPartialIncludingPastEnd() {
        AuthToken token = new AuthToken();
        token.setName("operations");
        when(accounts.listTokens()).thenReturn(java.util.Collections.nCopies(25, token));
        var first = service.tokens(null, null);
        assertEquals(20, first.items().size());
        assertEquals(25, first.total());
        assertTrue(first.hasMore());
        assertTrue(first.partial());
        var last = service.tokens(20, 20);
        assertEquals(5, last.items().size());
        assertFalse(last.hasMore());
        assertTrue(last.partial());
        assertTrue(service.tokens(30, 20).items().isEmpty());
        assertThrows(IllegalArgumentException.class, () -> service.tokens(-1, 20));
        assertThrows(IllegalArgumentException.class, () -> service.tokens(10001, 20));
        assertThrows(IllegalArgumentException.class, () -> service.tokens(0, 101));
    }

}
