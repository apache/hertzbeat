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

import java.time.ZoneId;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfig;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfigRequest;
import org.apache.hertzbeat.manager.service.AccountService;
import org.apache.hertzbeat.manager.service.ModelProviderConfigurationService;
import org.apache.hertzbeat.manager.service.PluginService;
import org.apache.hertzbeat.manager.service.SystemConfigService;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentWorkflow;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

/** Explicit allowlisted platform metadata. No raw credential, URL, parameter map or filesystem path is returned. */
@Service
public class AgentPlatformMetadataToolService {
    private final SystemConfigService system;
    private final AccountService accounts;
    private final PluginService plugins;
    private final ModelProviderConfigurationService providers;
    private final ObjectProvider<DeploymentWorkflow> deployment;

    public AgentPlatformMetadataToolService(SystemConfigService system, AccountService accounts,
            PluginService plugins, ModelProviderConfigurationService providers,
            ObjectProvider<DeploymentWorkflow> deployment) {
        this.system = system;
        this.accounts = accounts;
        this.plugins = plugins;
        this.providers = providers;
        this.deployment = deployment;
    }

    @Tool(name = "system.config_get", description = "Read only timezone, locale and theme system configuration.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public SystemConfig configGet() {
        return system.getConfig();
    }

    @Tool(name = "system.config_update", description = "Save timezone, locale and theme with native validation and authoritative readback.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public SystemConfig configUpdate(@ToolParam(description = "Complete timezone, locale and theme configuration.") SystemConfigRequest request) {
        if (request == null || request.isUnknownFieldPresent()) {
            throw new IllegalArgumentException("Typed system configuration is required");
        }
        return system.saveAndGetConfig(request);
    }

    @Tool(name = "system.timezones", description = "List timezone identifiers accepted by the runtime.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public List<String> timezones() {
        return ZoneId.getAvailableZoneIds().stream().sorted().toList();
    }

    @Tool(name = "token.metadata_list", description = "List token identifiers, names, scopes and status without token, hash or mask values. Admin only.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public TokenMetadataPage tokens(
            @ToolParam(required = false, description = "Offset from 0 to 10000; defaults to 0.") Integer offset,
            @ToolParam(required = false, description = "Page size from 1 to 100; defaults to 20.") Integer limit) {
        int start = offset == null ? 0 : offset;
        int size = limit == null ? 20 : limit;
        if (start < 0 || start > 10000 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Bounded token pagination is required");
        }
        var all = accounts.listTokens();
        int from = Math.min(start, all.size());
        int to = Math.min(from + size, all.size());
        List<TokenMetadata> items = all.subList(from, to).stream()
                .map(token -> new TokenMetadata(token.getId(), token.getName(), token.getTokenScope(), token.getStatus())).toList();
        return new TokenMetadataPage(items, start, size, all.size(), to < all.size(), items.size() < all.size());
    }

    @Tool(name = "plugin.metadata_list", description = "List plugin identifiers, names, enabled state and parameter counts. Excludes paths, implementation classes and all parameter values.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Page<PluginMetadata> plugins(@ToolParam(required = false, description = "Name search.") String search,
            @ToolParam(description = "Zero-based page.") int page,
            @ToolParam(description = "Size from 1 to 100.") int size) {
        if (page < 0 || size < 1 || size > 100 || (search != null && search.length() > 255)) {
            throw new IllegalArgumentException("Bounded pagination and search are required");
        }
        return plugins.getPlugins(search, page, size).map(plugin -> new PluginMetadata(plugin.getId(),
                plugin.getName(), plugin.getEnableStatus(), plugin.getParamCount()));
    }

    @Tool(name = "provider.metadata_list", description = "List saved model provider metadata and configured-key markers, excluding API keys and endpoint URLs.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public ProviderMetadataList providers() {
        var state = providers.getState();
        return new ProviderMetadataList(state.getActiveProviderUid(), state.getProviders().stream()
                .map(provider -> new ProviderMetadata(provider.getUid(), provider.getType(), provider.getCode(),
                        provider.getModel(), provider.getApiKey() != null && !provider.getApiKey().isBlank())).toList());
    }

    @Tool(name = "deployment.operation_status", description = "Read an existing deployment migration operation. Does not start, activate or export migrations.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public MigrationView operation(@ToolParam(description = "Existing migration operation id.") String operationId) {
        if (operationId == null || operationId.isBlank() || operationId.length() > 128) {
            throw new IllegalArgumentException("A bounded operation id is required");
        }
        DeploymentWorkflow workflow = deployment.getIfAvailable();
        if (workflow == null) {
            throw new IllegalStateException("Deployment workflow is unavailable");
        }
        return workflow.migration(operationId);
    }


    /** Token Metadata typed projection. */
    public record TokenMetadata(Long id, String name, String scope, Byte status) { }

    /** Token Metadata Page typed projection. */
    public record TokenMetadataPage(List<TokenMetadata> items, int offset, int limit, int total,
                                    boolean hasMore, boolean partial) { }

    /** Plugin Metadata typed projection. */
    public record PluginMetadata(Long id, String name, Boolean enabled, Integer parameterCount) { }

    /** Provider Metadata typed projection. */
    public record ProviderMetadata(String uid, String type, String code, String model, boolean apiKeyConfigured) { }

    /** Provider Metadata List typed projection. */
    public record ProviderMetadataList(String activeProviderUid, List<ProviderMetadata> providers) { }
}
