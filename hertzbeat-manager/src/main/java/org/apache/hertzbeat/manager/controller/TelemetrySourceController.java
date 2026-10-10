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

package org.apache.hertzbeat.manager.controller;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.Collection;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.observability.gateway.SelfTelemetryProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.apache.hertzbeat.observability.config.SelfMicrometerExporter;
import org.springframework.web.bind.annotation.RestController;

/** Availability is separate from authorization; configuration alone never implies readiness. */
@RestController
public class TelemetrySourceController {

    private final SelfTelemetryProperties properties;
    private ObjectProvider<SelfMicrometerExporter> metricsExporter;

    @Autowired
    public void setMetricsExporter(ObjectProvider<SelfMicrometerExporter> metricsExporter) {
        this.metricsExporter = metricsExporter;
    }

    public TelemetrySourceController(SelfTelemetryProperties properties) {
        this.properties = properties;
    }

    private String metricsStatus() {
        SelfMicrometerExporter exporter = metricsExporter == null ? null : metricsExporter.getIfAvailable();
        return exporter == null ? "REGISTRY_UNAVAILABLE" : exporter.getStatus();
    }

    @GetMapping("/api/telemetry/sources")
    public Message<Map<String, Object>> sources() {
        SubjectSum subject = SurenessContextHolder.getBindSubject();
        Object workspace = subject == null || subject.getPrincipalMap() == null ? null
                : subject.getPrincipalMap().getPrincipal(AuthTokenScopes.CLAIM_WORKSPACE_ID);
        boolean accessible = subject != null && subject.getRoles() instanceof Collection<?> roles
                && roles.contains("admin") && workspace != null
                && java.util.Objects.equals(properties.getWorkspaceId(), String.valueOf(workspace));
        String reason = !properties.isEnabled() ? "Self telemetry is not configured"
                : !accessible ? "Self telemetry requires admin and an explicitly authorized workspace"
                : !properties.isReady() ? "Self telemetry storage is not ready" : "";
        return Message.success(Map.of(
                "external", Map.of("enabled", true, "ready", true, "accessible", true),
                "self", Map.of("enabled", properties.isEnabled(), "ready", properties.isReady(),
                        "accessible", accessible, "workspaceId", accessible ? properties.getWorkspaceId() : "",
                        "reason", reason, "statusReason", properties.getStatusReason(), "metricsStatus", metricsStatus())));
    }
}
