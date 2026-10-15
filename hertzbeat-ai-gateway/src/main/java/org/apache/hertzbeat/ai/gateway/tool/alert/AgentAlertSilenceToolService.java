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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import java.time.Duration;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.alert.dto.AlertSilencePageResponse;
import org.apache.hertzbeat.alert.dto.AlertSilenceRequest;
import org.apache.hertzbeat.alert.dto.AlertSilenceResponse;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/**
 * One-time alert silence management tools.
 */
@Service
public class AgentAlertSilenceToolService {

    private static final Duration MAX_SILENCE_DURATION = Duration.ofDays(366);

    private final AlertSilenceService alertSilenceService;

    public AgentAlertSilenceToolService(AlertSilenceService alertSilenceService) {
        this.alertSilenceService = alertSilenceService;
    }

    @Tool(name = "alert_silence.list", description = "List alert silence policies with bounded pagination.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> listSilences(
            @ToolParam(required = false, description = "Silence name search text.") String search,
            @ToolParam(required = false, description = "Zero-based page index.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size; maximum 100.") Integer pageSize) {
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, Integer.MAX_VALUE);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100);
        AlertSilencePageResponse page = alertSilenceService.list(null, search, "gmtCreate", "desc",
                resolvedPageIndex, resolvedPageSize);
        return Map.of("content", page.content().stream().map(this::silenceRow).toList(),
                "pageIndex", page.number(), "pageSize", page.size(),
                "totalElements", page.totalElements(), "totalPages", page.totalPages());
    }

    @Tool(name = "alert_silence.get", description = "Get an exact alert silence policy by id.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> getSilence(@ToolParam(description = "Alert silence id.") Long silenceId) {
        return silenceRow(requiredSilence(silenceId));
    }

    @Tool(name = "alert_silence.create_once",
            description = "Create a one-time alert silence using an explicit timezone-aware interval.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> createOnce(
            @ToolParam(description = "Silence policy name; maximum 100 characters.") String name,
            @ToolParam(required = false, description = "Exact alert label matches; empty matches all alerts.")
            Map<String, String> labels,
            @ToolParam(required = false,
                    description = "ISO-8601 start date-time with timezone; defaults to the current time.")
            String startsAt,
            @ToolParam(required = false,
                    description = "ISO-8601 end date-time with timezone; defaults to one hour after startsAt.")
            String endsAt,
            @ToolParam(required = false, description = "Enable immediately; default true.") Boolean enabled) {
        if (name == null || name.isBlank() || name.length() > 100) {
            throw new IllegalArgumentException("name is required and must not exceed 100 characters");
        }
        Map<String, String> resolvedLabels = labels == null ? Map.of() : new LinkedHashMap<>(labels);
        validateLabels(resolvedLabels);
        ZonedDateTime start = dateTime(startsAt, ZonedDateTime.now(ZoneOffset.UTC));
        ZonedDateTime end = dateTime(endsAt, start.plusHours(1));
        Duration duration = Duration.between(start, end);
        if (duration.isNegative() || duration.isZero() || duration.compareTo(MAX_SILENCE_DURATION) > 0) {
            throw new IllegalArgumentException("endsAt must be after startsAt and the interval must not exceed 366 days");
        }
        AlertSilenceRequest request = new AlertSilenceRequest();
        request.setName(name.trim());
        request.setEnable(enabled == null || enabled);
        request.setMatchAll(resolvedLabels.isEmpty());
        request.setType((byte) 0);
        request.setLabels(resolvedLabels);
        request.setPeriodStart(start);
        request.setPeriodEnd(end);
        return silenceRow(alertSilenceService.create(request));
    }

    @Tool(name = "alert_silence.toggle", description = "Enable or disable an exact alert silence policy.")
    @AgentToolPolicy(risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> toggleSilence(
            @ToolParam(description = "Alert silence id.") Long silenceId,
            @ToolParam(description = "Whether the silence should be enabled.") Boolean enabled) {
        if (enabled == null) {
            throw new IllegalArgumentException("enabled is required");
        }
        AlertSilenceResponse silence = requiredSilence(silenceId);
        AlertSilenceRequest request = requestFrom(silence);
        request.setEnable(enabled);
        return silenceRow(alertSilenceService.update(request));
    }

    @Tool(name = "alert_silence.delete", description = "Permanently delete an exact alert silence policy.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> deleteSilence(
            @ToolParam(description = "Alert silence id.") Long silenceId,
            @ToolParam(description = "Operator-provided deletion reason recorded with the tool invocation.")
            String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason is required for alert_silence.delete");
        }
        AlertSilenceResponse silence = requiredSilence(silenceId);
        alertSilenceService.delete(Set.of(silence.id()));
        return Map.of("operation", "delete", "silenceId", silence.id(), "name", silence.name());
    }

    private AlertSilenceResponse requiredSilence(Long silenceId) {
        if (silenceId == null || silenceId <= 0) {
            throw new IllegalArgumentException("silenceId must be positive");
        }
        return alertSilenceService.get(silenceId);
    }

    private ZonedDateTime dateTime(String value, ZonedDateTime defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return ZonedDateTime.parse(value);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("Date-time values must be ISO-8601 and include a timezone", exception);
        }
    }

    private void validateLabels(Map<String, String> labels) {
        if (labels.size() > 50 || labels.entrySet().stream()
                .anyMatch(entry -> entry.getKey() == null || entry.getKey().isBlank()
                        || entry.getValue() == null || entry.getValue().isBlank())
                || JsonUtil.toJson(labels).length() > 2048) {
            throw new IllegalArgumentException("labels must contain at most 50 non-blank entries and fit in 2048 characters");
        }
    }

    private AlertSilenceRequest requestFrom(AlertSilenceResponse silence) {
        AlertSilenceRequest request = new AlertSilenceRequest();
        request.setId(silence.id());
        request.setName(silence.name());
        request.setEnable(silence.enable());
        request.setMatchAll(silence.matchAll());
        request.setType(silence.type());
        request.setLabels(silence.labels());
        request.setDays(silence.days());
        request.setPeriodStart(silence.periodStart());
        request.setPeriodEnd(silence.periodEnd());
        return request;
    }

    private Map<String, Object> silenceRow(AlertSilenceResponse silence) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("silenceId", silence.id());
        row.put("name", silence.name());
        row.put("enabled", silence.enable());
        row.put("type", silence.type() != null && silence.type() == 1 ? "recurring" : "once");
        row.put("matchAll", silence.matchAll());
        row.put("labels", silence.labels() == null ? Map.of() : silence.labels());
        row.put("startsAt", silence.periodStart());
        row.put("endsAt", silence.periodEnd());
        return row;
    }
}
