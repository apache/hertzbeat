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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationCatalogV2Service;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationDetectionV2Service;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationGuideV2Renderer;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationIntakeProfileV2Service;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Typed native onboarding reads. Rendering is not installation, deployment or telemetry reception.
 */
@Service
public class AgentInstrumentationToolService {
    private final InstrumentationCatalogV2Service catalog;
    private final InstrumentationIntakeProfileV2Service profiles;
    private final InstrumentationGuideV2Renderer guides;
    private final InstrumentationDetectionV2Service detection;

    public AgentInstrumentationToolService(
            InstrumentationCatalogV2Service catalog,
            InstrumentationIntakeProfileV2Service profiles,
            InstrumentationGuideV2Renderer guides,
            InstrumentationDetectionV2Service detection) {
        this.catalog = catalog;
        this.profiles = profiles;
        this.guides = guides;
        this.detection = detection;
    }

    @Tool(
            name = "telemetry.instrumentation_catalog",
            description =
                    "Read the native version-2 onboarding catalog. Page through groups, sources or"
                            + " recipes using section and offset. Catalog support is capability"
                            + " metadata, never proof that a source is configured or sending data.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> catalog(
            @ToolParam(description = "Exactly groups, sources or recipes.") String section,
            @ToolParam(required = false, description = "Zero-based offset, 0 to 10000; default 0.")
                    Integer offset,
            @ToolParam(required = false, description = "Page size, 1 to 10; default 5.")
                    Integer limit) {
        bounds(offset, limit, 10);
        if (section == null || !List.of("groups", "sources", "recipes").contains(section)) {
            throw new IllegalArgumentException("Choose groups, sources or recipes");
        }
        var data = catalog.catalog();
        List<?> items;
        if ("groups".equals(section)) {
            items = data.groups();
        } else if ("sources".equals(section)) {
            items = data.sources();
        } else {
            items = data.recipes();
        }
        var result = page(items, offset, limit, 5);
        result.put("schemaVersion", data.schemaVersion());
        result.put("section", section);
        return result;
    }

    @Tool(
            name = "telemetry.intake_profiles",
            description =
                    "List native explicitly advertised non-secret OTLP intake profiles."
                            + " Unconfigured or unavailable discovery is not an empty healthy"
                            + " environment. No token value is read, generated or returned.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> profiles(
            @ToolParam(required = false, description = "Zero-based offset, 0 to 10000.")
                    Integer offset,
            @ToolParam(required = false, description = "Page size 1 to 10; default 5.")
                    Integer limit) {
        bounds(offset, limit, 10);
        var response = profiles.profiles();
        var result = page(response.profiles(), offset, limit, 5);
        result.put("schemaVersion", response.schemaVersion());
        result.put("status", response.status());
        result.put("errorCode", response.errorCode());
        result.put("defaultProfileId", response.defaultProfileId());
        return result;
    }

    @Tool(
            name = "telemetry.instrumentation_render",
            description =
                    "Render the native v2 onboarding guide for an exact catalog recipe, service"
                        + " identity and advertised intake profile. Returns a bounded page of"
                        + " complete guide blocks and credential placeholders only. It does not run"
                        + " commands, install software, alter collector settings or send telemetry."
                        + " Use the native secure form for credentials; never place them in chat.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> render(
            @ToolParam(
                            description =
                                    "Complete native schemaVersion=2 selection; profile ID comes"
                                            + " from intake_profiles, not a caller URL.")
                    RenderRequest request,
            @ToolParam(required = false, description = "Guide block offset, 0 to 10000.")
                    Integer offset,
            @ToolParam(
                            required = false,
                            description = "Complete blocks per page, 1 to 3; default 1.")
                    Integer limit) {
        bounds(offset, limit, 3);
        RenderResponse response;
        try {
            response = guides.render(request);
        } catch (InstrumentationV2RequestException invalid) {
            return blocked(invalid);
        }
        var result = page(response.blocks(), offset, limit, 1);
        result.put("schemaVersion", response.schemaVersion());
        result.put("recipeId", response.recipeId());
        result.put("sourceKind", response.sourceKind());
        result.put("service", response.service());
        result.put("intakeProfile", response.intakeProfile());
        result.put("signals", response.signals());
        result.put("components", response.components());
        result.put("secretPlaceholders", response.secretPlaceholders());
        result.put("executionStatus", "GUIDE_RENDERED");
        result.put("applied", false);
        result.put("nativePath", "/observability/integration");
        return result;
    }

    @Tool(
            name = "telemetry.instrumentation_detect",
            description =
                    "Use native v2 storage-backed reception detection for Metrics, Logs and Traces,"
                        + " scoped to the exact service/namespace/environment/instance/endpoint and"
                        + " startedAt epoch milliseconds. Reports waiting, received, unsupported,"
                        + " unavailable and error honestly. Does not send sample data or configure"
                        + " a source.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> detect(
            @ToolParam(
                            description =
                                    "Complete native schemaVersion=2 request and startedAt epoch"
                                        + " milliseconds; use a known catalog recipe and advertised"
                                        + " intake profile.")
                    DetectionRequest request) {
        DetectionResponse response;
        try {
            response = detection.detect(request);
        } catch (InstrumentationV2RequestException invalid) {
            return blocked(invalid);
        }
        return Map.of(
                "schemaVersion",
                response.schemaVersion(),
                "detection",
                response,
                "receivedSignalCount",
                response.signals().values().stream()
                        .filter(signal -> signal.status() == DetectionStatus.RECEIVED)
                        .count());
    }

    private Map<String, Object> blocked(InstrumentationV2RequestException error) {
        return Map.of(
                "schemaVersion",
                2,
                "executionStatus",
                "BLOCKED",
                "errorCode",
                error.errorCode().code(),
                "applied",
                false,
                "request",
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport.invocation()
                        .getRequest()
                        .getArguments()
                        .get("request"),
                "inputHash",
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport.invocation()
                        .getLedgerCall()
                        .getInputHash(),
                "guidance",
                "Use native catalog values exactly. An unavailable or unadvertised intake requires"
                    + " operator configuration; no credential was generated, guide applied, or"
                    + " signal received. endpoint is an optional HTTP route template, never a full"
                    + " URL.");
    }

    private void bounds(Integer offset, Integer limit, int max) {
        if (offset != null && (offset < 0 || offset > 10000)
                || limit != null && (limit < 1 || limit > max)) {
            throw new IllegalArgumentException("Bounded native onboarding pagination is required");
        }
    }

    private Map<String, Object> page(
            List<?> items, Integer offset, Integer limit, int defaultLimit) {
        int start = offset == null ? 0 : offset;
        int size = limit == null ? defaultLimit : limit;
        int from = Math.min(start, items.size());
        int end = Math.min(from + size, items.size());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", List.copyOf(items.subList(from, end)));
        result.put("offset", start);
        result.put("limit", size);
        result.put("returnedCount", end - from);
        result.put("total", items.size());
        result.put("hasMore", end < items.size());
        return result;
    }
}
