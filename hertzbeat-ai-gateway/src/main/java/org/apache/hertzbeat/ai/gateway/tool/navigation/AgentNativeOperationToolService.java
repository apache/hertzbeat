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

package org.apache.hertzbeat.ai.gateway.tool.navigation;

import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Named native-page handoffs, never arbitrary URLs or privileged execution. */
@Service
public class AgentNativeOperationToolService {

    @Tool(name = "native.token_manage", description = "Return native-page instructions only: Generate or revoke an API token in the native token form. Keep token values out of chat.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> tokenManage() {
        return handoff("token_manage", "/settings/tokens", "Generate or revoke an API token in the native token form. Keep token values out of chat.");
    }

    @Tool(name = "native.plugin_manage", description = "Return native-page instructions only: Upload, enable, disable or remove plugins in the native plugin page.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> pluginManage() {
        return handoff("plugin_manage", "/settings/plugins", "Upload, enable, disable or remove plugins in the native plugin page.");
    }

    @Tool(name = "native.provider_configure", description = "Return native-page instructions only: Open provider settings in the AI workspace and enter API keys only in its secure native editor.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> providerConfigure() {
        return handoff("provider_configure", "/ai", "Open provider settings in the AI workspace and enter API keys only in its secure native editor.");
    }

    @Tool(name = "native.notification_channel_configure", description = "Return native-page instructions only: Configure email or SMS channel credentials in the native form.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> notificationChannelConfigure() {
        return handoff("notification_channel_configure", "/settings/notifications/channels", "Configure email or SMS channel credentials in the native form.");
    }

    @Tool(name = "native.receiver_configure", description = "Return native-page instructions only: Create or edit notification receivers. Enter hook URLs, tokens and"
            + " credentials only in the native form.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> receiverConfigure() {
        return handoff("receiver_configure", "/settings/notifications/receivers", "Create or edit notification receivers. Enter hook URLs, tokens and credentials only in the native form.");
    }

    @Tool(name = "native.receiver_test", description = "Return native-page instructions only: Review the real recipient and channel, then explicitly send a test in the native form.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> receiverTest() {
        return handoff("receiver_test", "/settings/notifications/receivers", "Review the real recipient and channel, then explicitly send a test in the native form.");
    }

    @Tool(name = "native.object_store_configure", description = "Return native-page instructions only: Configure object storage credentials in the native form.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> objectStoreConfigure() {
        return handoff("object_store_configure", "/settings/storage/object-store", "Configure object storage credentials in the native form.");
    }

    @Tool(name = "native.deployment_manage", description = "Return native-page instructions only: Review deployment settings and perform an explicitly confirmed"
            + " activation or reset in the native page.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deploymentManage() {
        return handoff("deployment_manage", "/settings/deployment", "Review deployment settings and perform an explicitly confirmed activation or reset in the native page.");
    }

    @Tool(name = "native.deployment_migrate", description = "Return native-page instructions only: Review migration impact and complete the native migration workflow.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deploymentMigrate() {
        return handoff("deployment_migrate", "/settings/deployment/migration", "Review migration impact and complete the native migration workflow.");
    }

    @Tool(name = "native.collector_install", description = "Return native-page instructions only: Generate deployment instructions for a registered Collector in the"
            + " native page; installation remains a separate user action.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> collectorInstall() {
        return handoff("collector_install", "/settings/collectors", "Generate deployment instructions for a registered Collector in the native page; installation remains a separate user action.");
    }

    @Tool(name = "native.monitor_definition_edit", description = "Return native-page instructions only: Use the versioned monitor definition editor and review referencing monitors before saving.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> monitorDefinitionEdit() {
        return handoff("monitor_definition_edit", "/settings/monitor-definitions", "Use the versioned monitor definition editor and review referencing monitors before saving.");
    }

    @Tool(name = "native.monitor_import", description = "Return native-page instructions only: Use the native monitor file import dialog; do not paste files"
            + " containing credentials into chat. Track the returned task id with monitor.import_status.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> monitorImport() {
        return handoff("monitor_import", "/monitors", "Use the native monitor file import dialog; do not paste files containing credentials into chat. Track the"
                + " returned task id with monitor.import_status.");
    }

    @Tool(name = "native.monitor_export", description = "Return native-page instructions only: Export monitor configuration directly in the native page; exported"
            + " secrets must not enter model context.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> monitorExport() {
        return handoff("monitor_export", "/monitors", "Export monitor configuration directly in the native page; exported secrets must not enter model context.");
    }

    @Tool(name = "native.system_configure", description = "Return native-page instructions only: Use the named native system configuration form; security-sensitive values stay out of chat.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> systemConfigure() {
        return handoff("system_configure", "/settings/system", "Use the named native system configuration form; security-sensitive values stay out of chat.");
    }

    @Tool(name = "native.monitor_edit", description = "Return the native monitor editor path for protocol parameters and credentials; this tool does not execute the edit.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> monitorEdit(@ToolParam(description = "Monitor id.") Long monitorId) {
        if (monitorId == null || monitorId <= 0) {
            throw new IllegalArgumentException("A positive monitor id is required");
        }
        return handoff("monitor_edit", "/monitors/" + monitorId + "/edit",
                "Edit protocol parameters or Grafana settings in the native monitor form. Keep credentials out of chat.");
    }

    private Map<String, Object> handoff(String operation, String path, String instructions) {
        return Map.of("operation", operation, "delivery", "native_handoff", "executionStatus", "NOT_EXECUTED",
                "path", path, "instructions", instructions, "requiresUserAction", true);
    }
}
