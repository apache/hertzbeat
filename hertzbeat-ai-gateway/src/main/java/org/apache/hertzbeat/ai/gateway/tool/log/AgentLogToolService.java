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

package org.apache.hertzbeat.ai.gateway.tool.log;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.observability.logs.controller.LogRepeatedErrorsController;
import org.apache.hertzbeat.observability.logs.controller.LogManagerController;
import org.apache.hertzbeat.observability.logs.controller.LogSseController;
import org.apache.hertzbeat.observability.logs.sse.LogSseFilterCriteria;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeTextSanitizer;
import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.query.LogComparisonParser;
import org.apache.hertzbeat.observability.logs.query.LogQuerySetParser;
import org.apache.hertzbeat.observability.logs.query.LogCalculatedParser;
import org.apache.hertzbeat.observability.logs.query.LogSubqueryParser;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Bounded OpenTelemetry log query tools backed by the product workspace query service. */
@Service
public class AgentLogToolService {

    private static final long MAX_RANGE_MILLIS = Duration.ofDays(7).toMillis();
    private static final Set<String> SEVERITIES = Set.of("TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL");

    private final LogQueryService logQueryService;
    private LogQueryController queryController;
    private LogRepeatedErrorsController repeatedErrorsController;
    private LogManagerController managerController;
    private LogSseController sseController;

    @Autowired
    public AgentLogToolService(ObjectProvider<LogQueryService> logQueryService,
                               ObjectProvider<LogQueryController> queryController,
                               ObjectProvider<LogRepeatedErrorsController> repeatedErrorsController,
                               ObjectProvider<LogManagerController> managerController,
                               ObjectProvider<LogSseController> sseController) {
        this(logQueryService.getIfAvailable());
        this.queryController = queryController.getIfAvailable();
        this.repeatedErrorsController = repeatedErrorsController.getIfAvailable();
        this.managerController = managerController.getIfAvailable();
        this.sseController = sseController.getIfAvailable();
    }

    public AgentLogToolService(LogQueryService logQueryService) {
        this.logQueryService = logQueryService;
    }

    public AgentLogToolService(ObjectProvider<LogQueryService> logQueryService) {
        this(logQueryService.getIfAvailable());
    }

    public AgentLogToolService(LogQueryService logQueryService, LogQueryController queryController) {
        this(logQueryService);
        this.queryController = queryController;
    }

    @Tool(name = "logs.repeated_errors.summary", description = "Read bounded repeated-error summary in the trusted workspace.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> repeatedErrorsSummary(
            @ToolParam(description = "Start epoch milliseconds.") long start,
            @ToolParam(description = "End epoch milliseconds, at most 7 days after start.") long end,
            @ToolParam(required = false, description = "Service name.") String serviceName,
            @ToolParam(required = false, description = "Deployment environment.") String environment) {
        requireInvocationWorkspace();
        validateRange(start, end);
        validateText(serviceName, 512, "serviceName");
        validateText(environment, 512, "environment");
        if (repeatedErrorsController == null) { throw new CommonException("repeated_errors_unavailable"); }
        Map<String, String> parameters = new LinkedHashMap<>();
        parameters.put("start", Long.toString(start));
        parameters.put("end", Long.toString(end));
        if (serviceName != null) { parameters.put("serviceName", serviceName); }
        if (environment != null) { parameters.put("environment", environment); }
        return boundedResult(repeatedErrorsController.summary(parameters).getBody());
    }

    @Tool(name = "logs.repeated_errors.records", description = "Read bounded repeated-error records in the trusted workspace.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> repeatedErrorsRecords(
            @ToolParam(description = "Start epoch milliseconds.") long start,
            @ToolParam(description = "End epoch milliseconds, at most 7 days after start.") long end,
            @ToolParam(required = false, description = "Service name.") String serviceName,
            @ToolParam(required = false, description = "Deployment environment.") String environment,
            @ToolParam(description = "Exact repeated-error group key from summary.") String groupKey,
            @ToolParam(description = "Exact representative log UID from summary.") String representativeUid) {
        requireInvocationWorkspace();
        validateRange(start, end);
        validateText(serviceName, 512, "serviceName");
        validateText(environment, 512, "environment");
        if (repeatedErrorsController == null) { throw new CommonException("repeated_errors_unavailable"); }
        Map<String, String> parameters = new LinkedHashMap<>();
        parameters.put("start", Long.toString(start));
        parameters.put("end", Long.toString(end));
        if (serviceName != null) { parameters.put("serviceName", serviceName); }
        if (environment != null) { parameters.put("environment", environment); }
        validateText(groupKey, 2048, "groupKey");
        validateText(representativeUid, 128, "representativeUid");
        parameters.put("groupKey", groupKey);
        parameters.put("representativeUid", representativeUid);
        return boundedResult(repeatedErrorsController.records(parameters).getBody());
    }

    @Tool(name = "logs.batch_delete", description = "Permanently delete up to 100 exact log timestamps in the authenticated workspace; requires admin approval.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS, access = AgentToolAccess.ADMIN,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> batchDelete(
            @ToolParam(description = "Exact Unix nanosecond timestamps, 1 to 100 entries.") List<Long> timeUnixNanos) {
        requireInvocationWorkspace();
        if (timeUnixNanos == null || timeUnixNanos.isEmpty() || timeUnixNanos.size() > 100
                || timeUnixNanos.stream().anyMatch(value -> value == null || value < 0)) {
            throw new IllegalArgumentException("Provide 1 to 100 non-negative log timestamps");
        }
        if (!workspaceId().equals(AuthTokenRequestContext.currentAuthenticatedWorkspaceId())) {
            throw new IllegalArgumentException("Authenticated workspace mismatch");
        }
        if (managerController == null) { throw new CommonException("log_management_unavailable"); }
        var response = managerController.batchDelete(List.copyOf(timeUnixNanos));
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new CommonException("log_deletion_failed");
        }
        return boundedResult(response.getBody());
    }

    @Tool(name = "logs.live.validate", description = "Validate product live-log filters without opening an unbounded stream.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> validateLive(
            @ToolParam(description = "Product log filters; start/end delimit the investigation scope.") AgentLogQuery q) {
        requireInvocationWorkspace();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("live");
        if (!workspaceId().equals(AuthTokenRequestContext.currentAuthenticatedWorkspaceId())) {
            throw new IllegalArgumentException("Authenticated workspace mismatch");
        }
        if (sseController == null) { throw new CommonException("log_live_unavailable"); }
        LogSseFilterCriteria criteria = new LogSseFilterCriteria();
        criteria.setSeverityNumber(q.severityNumber());
        criteria.setSeverityText(q.severityText());
        criteria.setSeverityCategory(q.severityCategory());
        criteria.setTraceId(q.traceId());
        criteria.setSpanId(q.spanId());
        criteria.setServiceName(q.serviceName());
        criteria.setServiceNamespace(q.serviceNamespace());
        criteria.setEnvironment(q.environment());
        criteria.setEntityType(q.entityType());
        criteria.setCollectorId(q.collectorId());
        criteria.setInstance(q.instance());
        criteria.setEndpoint(q.endpoint());
        criteria.setResourceFilter(q.resourceFilter());
        criteria.setAttributeFilter(q.attributeFilter());
        criteria.setSearchSyntax(q.searchSyntax());
        criteria.setLogGroupSelection(q.logGroupSelection());
        criteria.setLogSort(q.logSort());
        criteria.setLogNumericRange(q.logNumericRange());
        criteria.setEntityId(q.entityId() == null ? null : q.entityId().toString());
        criteria.setLogContent(q.search());
        criteria.setHideInternal(Boolean.TRUE.equals(q.hideInternal()));
        criteria.setHideNoise(Boolean.TRUE.equals(q.hideNoise()));
        var response = sseController.validate(criteria);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalArgumentException("Live log filter validation failed");
        }
        return Map.of("valid", true, "subscriptionOpened", false);
    }

    @Tool(name = "logs.live.snapshot", description = "Get one bounded recent log page, not an ongoing SSE subscription.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> liveSnapshot(
            @ToolParam(description = "Product log query; start/end must cover at most 15 minutes.") AgentLogQuery q) {
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("list");
        if (q.end() - q.start() > Duration.ofMinutes(15).toMillis()) {
            throw new IllegalArgumentException("Live snapshot range must be at most 15 minutes");
        }
        Map<String, Object> result = new LinkedHashMap<>(list(q));
        result.put("subscriptionOpened", false);
        return result;
    }

    @Tool(name = "logs.analysis", description = "Query bounded workspace logs using the product analysis contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> analysis(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("analysis");
        return boundedResult(queryController.analysis(q.parameters()).getBody());
    }

    @Tool(name = "logs.facet_fields", description = "Query bounded workspace logs using the product facet_fields contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> facetFields(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("facetFields");
        return boundedResult(queryController.facetFields(q.parameters()).getBody());
    }

    @Tool(name = "logs.facet_values", description = "Query bounded workspace logs using the product facet_values contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> facetValues(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("facetValues");
        return boundedResult(queryController.facetValues(q.parameters()).getBody());
    }

    @Tool(name = "logs.transactions", description = "Query bounded workspace logs using the product transactions contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> transactions(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("transactions");
        return boundedResult(queryController.transactions(q.parameters()).getBody());
    }

    @Tool(name = "logs.transaction_detail", description = "Query bounded workspace logs using the product transaction_detail contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> transactionDetail(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("transactionDetail");
        return boundedResult(queryController.transactionDetail(q.parameters()).getBody());
    }

    @Tool(name = "logs.list", description = "Query bounded workspace logs using the product list contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> list(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("list");
        return boundedResult(queryController.list(q.entityId(),
                q.entityType(),
                q.start(),
                q.end(),
                q.traceId(),
                q.spanId(),
                q.severityNumber(),
                q.severityText(),
                q.severityCategory(),
                q.search(),
                q.serviceName(),
                q.serviceNamespace(),
                q.environment(),
                q.collectorId(),
                q.instance(),
                q.endpoint(),
                q.resourceFilter(),
                q.attributeFilter(),
                q.pageIndex() == null ? 0 : q.pageIndex(),
                q.pageSize() == null ? 20 : q.pageSize(),
                Boolean.TRUE.equals(q.hideInternal()),
                Boolean.TRUE.equals(q.hideNoise()),
                q.sort() == null ? "newest" : q.sort(),
                q.searchSyntax(),
                q.logGroupSelection(),
                q.logSort(),
                q.logNumericRange()).getBody());
    }

    @Tool(name = "logs.context", description = "Query bounded workspace logs using the product context contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> context(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("context");
        return boundedResult(queryController.context(q.logRecordUid(),
                q.start(),
                q.end(),
                q.logGroupSelection(),
                q.logNumericRange()).getBody());
    }

    @Tool(name = "logs.overview_stats", description = "Query bounded workspace logs using the product overview_stats contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> overviewStats(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("overviewStats");
        return boundedResult(queryController.overviewStats(q.entityId(),
                q.entityType(),
                q.start(),
                q.end(),
                q.traceId(),
                q.spanId(),
                q.severityNumber(),
                q.severityText(),
                q.severityCategory(),
                q.search(),
                q.serviceName(),
                q.serviceNamespace(),
                q.environment(),
                q.collectorId(),
                q.instance(),
                q.endpoint(),
                q.resourceFilter(),
                q.attributeFilter(),
                Boolean.TRUE.equals(q.hideInternal()),
                Boolean.TRUE.equals(q.hideNoise()),
                q.searchSyntax(),
                q.logGroupSelection(),
                q.logNumericRange()).getBody());
    }

    @Tool(name = "logs.trace_coverage_stats", description = "Query bounded workspace logs using the product trace_coverage_stats contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> traceCoverageStats(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("traceCoverageStats");
        return boundedResult(queryController.traceCoverageStats(q.entityId(),
                q.entityType(),
                q.start(),
                q.end(),
                q.traceId(),
                q.spanId(),
                q.severityNumber(),
                q.severityText(),
                q.severityCategory(),
                q.search(),
                q.serviceName(),
                q.serviceNamespace(),
                q.environment(),
                q.collectorId(),
                q.instance(),
                q.endpoint(),
                q.resourceFilter(),
                q.attributeFilter(),
                Boolean.TRUE.equals(q.hideInternal()),
                Boolean.TRUE.equals(q.hideNoise()),
                q.searchSyntax(),
                q.logGroupSelection(),
                q.logNumericRange()).getBody());
    }

    @Tool(name = "logs.trend_stats", description = "Query bounded workspace logs using the product trend_stats contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> trendStats(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("trendStats");
        return boundedResult(queryController.trendStats(q.entityId(),
                q.entityType(),
                q.start(),
                q.end(),
                q.traceId(),
                q.spanId(),
                q.severityNumber(),
                q.severityText(),
                q.severityCategory(),
                q.search(),
                q.serviceName(),
                q.serviceNamespace(),
                q.environment(),
                q.collectorId(),
                q.instance(),
                q.endpoint(),
                q.resourceFilter(),
                q.attributeFilter(),
                Boolean.TRUE.equals(q.hideInternal()),
                Boolean.TRUE.equals(q.hideNoise()),
                q.searchSyntax(),
                q.logGroupSelection(),
                q.logNumericRange()).getBody());
    }

    @Tool(name = "logs.group_by_stats", description = "Query bounded workspace logs using the product group_by_stats contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> groupByStats(
            @ToolParam(description = "Product log query controls; start/end required, maximum 7 days.") AgentLogQuery q) {
        requireController();
        if (q == null) { throw new IllegalArgumentException("query is required"); }
        q.validateOperation("groupByStats");
        return boundedResult(queryController.groupByStats(q.entityId(),
                q.entityType(),
                q.start(),
                q.end(),
                q.traceId(),
                q.spanId(),
                q.severityNumber(),
                q.severityText(),
                q.severityCategory(),
                q.search(),
                q.serviceName(),
                q.serviceNamespace(),
                q.environment(),
                q.collectorId(),
                q.instance(),
                q.endpoint(),
                q.resourceFilter(),
                q.attributeFilter(),
                q.groupBy(),
                q.limit() == null ? 20 : q.limit(),
                q.orderBy() == null ? "count-desc" : q.orderBy(),
                q.minCount() == null ? 1 : q.minCount(),
                Boolean.TRUE.equals(q.hideInternal()),
                Boolean.TRUE.equals(q.hideNoise()),
                q.searchSyntax(),
                q.logGroupSelection(),
                q.logNumericRange()).getBody());
    }

    @Tool(name = "logs.compare", description = "Run the product compare JSON schema with strict parser validation; no SQL or workspace override.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> compare(
            @ToolParam(description = "Existing product compare JSON envelope, maximum 32768 characters.") String source) {
        requireController();
        if (source == null || source.length() > 32768) {
            throw new IllegalArgumentException("Log envelope is missing or too long");
        }
        validateEnvelope(LogComparisonParser.parse(source).parameters());
        return boundedResult(queryController.compare(source).getBody());
    }

    @Tool(name = "logs.query_set", description = "Run the product query_set JSON schema with strict parser validation; no SQL or workspace override.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> querySet(
            @ToolParam(description = "Existing product query_set JSON envelope, maximum 32768 characters.") String source) {
        requireController();
        if (source == null || source.length() > 32768) {
            throw new IllegalArgumentException("Log envelope is missing or too long");
        }
        validateEnvelope(LogQuerySetParser.parse(source).parameters());
        return boundedResult(queryController.querySet(source).getBody());
    }

    @Tool(name = "logs.calculated", description = "Run the product calculated JSON schema with strict parser validation; no SQL or workspace override.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> calculated(
            @ToolParam(description = "Existing product calculated JSON envelope, maximum 32768 characters.") String source) {
        requireController();
        if (source == null || source.length() > 32768) {
            throw new IllegalArgumentException("Log envelope is missing or too long");
        }
        validateEnvelope(LogCalculatedParser.query(source).parameters());
        return boundedResult(queryController.calculated(source).getBody());
    }

    @Tool(name = "logs.subquery", description = "Run the product subquery JSON schema with strict parser validation; no SQL or workspace override.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> subquery(
            @ToolParam(description = "Existing product subquery JSON envelope, maximum 32768 characters.") String source) {
        requireController();
        if (source == null || source.length() > 32768) {
            throw new IllegalArgumentException("Log envelope is missing or too long");
        }
        validateEnvelope(LogSubqueryParser.parse(source).parameters());
        return boundedResult(queryController.subquery(source).getBody());
    }

    @Tool(name = "logs.validate_calculated", description = "Run the product validate_calculated JSON schema with strict parser validation; no SQL or workspace override.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> validateCalculated(
            @ToolParam(description = "Existing product validate_calculated JSON envelope, maximum 32768 characters.") String source) {
        requireController();
        if (source == null || source.length() > 32768) {
            throw new IllegalArgumentException("Log envelope is missing or too long");
        }
        LogCalculatedParser.validationRequest(source);
        return boundedResult(queryController.validateCalculated(source).getBody());
    }

    private void requireInvocationWorkspace() {
        String workspace = workspaceId();
        String invocationWorkspace = AgentToolContextSupport.invocation().getRequest().getWorkspaceId();
        if (!workspace.equals(invocationWorkspace)) {
            throw new IllegalArgumentException("log_workspace_context_mismatch");
        }
    }

    private void requireController() {
        requireInvocationWorkspace();
        if (queryController == null) {
            throw new CommonException("log_query_controller_unavailable");
        }
    }

    private void validateEnvelope(Map<String, String> parameters) {
        validateRange(Long.parseLong(parameters.get("start")), Long.parseLong(parameters.get("end")));
    }

    private Map<String, Object> boundedResult(Object value) {
        String json = JsonUtil.toJson(value);
        if (json == null) {
            throw new IllegalStateException("signal_response_unavailable");
        }
        // Preserve structured secret-key detection before text fallback and response truncation.
        Map<String, Object> envelope = new LinkedHashMap<>();
        Object parsed = JsonUtil.fromJson(json, Object.class);
        if (parsed == null) {
            throw new IllegalStateException("signal_safe_projection_unavailable");
        }
        envelope.put("value", parsed);
        String redactedJson = JsonUtil.toJson(GatewaySecretRedactor.redactMap(envelope).get("value"));
        if (redactedJson == null) {
            throw new IllegalStateException("signal_safe_projection_unavailable");
        }
        String safe = AgentRuntimeTextSanitizer.redact(redactedJson);
        boolean truncated = safe.length() > 24000;
        boolean backendPartial = hasPartial(JsonUtil.fromJson(json));
        return Map.of("data", truncated ? safe.substring(0, 24000) : safe,
                "partial", truncated || backendPartial, "projectionTruncated", truncated,
                "format", "json_text", "maxCharacters", 24000);
    }

    private boolean hasPartial(tools.jackson.databind.JsonNode node) {
        if (node == null) { return false; }
        if (node.isObject() && (node.path("partial").asBoolean(false)
                || node.path("truncated").asBoolean(false) || node.path("hasMore").asBoolean(false))) {
            return true;
        }
        if (node.isObject() && node.path("content").isArray()
                && (node.path("totalElements").asLong(0) > node.path("content").size()
                    || node.path("pageIndex").asInt(0) > 0)) {
            return true;
        }
        if (node.isArray() || node.isObject()) {
            for (var child : node) {
                if (hasPartial(child)) { return true; }
            }
        }
        return false;
    }

    @Tool(name = "logs.query",
            description = "Query one exact workspace-owned OpenTelemetry log page in a bounded time range.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> queryLogs(
            @ToolParam(required = false,
                    description = "Start Unix timestamp in milliseconds; defaults to one hour before end.") Long start,
            @ToolParam(required = false,
                    description = "End Unix timestamp in milliseconds; defaults to the current time.") Long end,
            @ToolParam(required = false, description = "Exact OpenTelemetry trace id.") String traceId,
            @ToolParam(required = false, description = "Exact OpenTelemetry span id.") String spanId,
            @ToolParam(required = false, description = "OpenTelemetry severity number from 1 to 24.")
            Integer severityNumber,
            @ToolParam(required = false, description = "Severity text: TRACE, DEBUG, INFO, WARN, ERROR, or FATAL.")
            String severityText,
            @ToolParam(required = false, description = "Log body search text; maximum 256 characters.") String search,
            @ToolParam(required = false, description = "Exact OpenTelemetry service name.") String serviceName,
            @ToolParam(required = false, description = "Exact OpenTelemetry service namespace.")
            String serviceNamespace,
            @ToolParam(required = false, description = "Exact deployment environment.") String environment,
            @ToolParam(required = false, description = "Exact resource attribute filter.") String resourceFilter,
            @ToolParam(required = false, description = "Exact log attribute filter.") String attributeFilter,
            @ToolParam(required = false, description = "Hide internal workspace infrastructure logs.")
            Boolean hideInternal,
            @ToolParam(required = false, description = "Hide known demo infrastructure noise logs.") Boolean hideNoise,
            @ToolParam(required = false, description = "Zero-based page index; maximum 10000.") Integer pageIndex,
            @ToolParam(required = false, description = "Page size; maximum 100.") Integer pageSize) {
        long resolvedEnd = end == null ? System.currentTimeMillis() : end;
        long resolvedStart = start == null ? resolvedEnd - Duration.ofHours(1).toMillis() : start;
        validateRange(resolvedStart, resolvedEnd);
        if (severityNumber != null && (severityNumber < 1 || severityNumber > 24)) {
            throw new IllegalArgumentException("severityNumber must be from 1 to 24");
        }
        String resolvedSeverity = severityText;
        if (StringUtils.hasText(severityText)) {
            resolvedSeverity = severityText.toUpperCase(Locale.ROOT);
            if (!SEVERITIES.contains(resolvedSeverity)) {
                throw new IllegalArgumentException("severityText must be TRACE, DEBUG, INFO, WARN, ERROR, or FATAL");
            }
        }
        validateText(search, 256, "search");
        validateText(serviceName, 512, "serviceName");
        validateText(serviceNamespace, 512, "serviceNamespace");
        validateText(environment, 512, "environment");
        validateText(resourceFilter, 2048, "resourceFilter");
        validateText(attributeFilter, 2048, "attributeFilter");
        int resolvedPageIndex = AgentToolContextSupport.bound(pageIndex == null ? 0 : pageIndex, 0, 10_000);
        int resolvedPageSize = AgentToolContextSupport.bound(pageSize == null ? 20 : pageSize, 1, 100);
        if (logQueryService == null) {
            throw new CommonException("log_query_service_unavailable");
        }
        Page<LogEntry> page = logQueryService.list(workspaceId(), null, resolvedStart, resolvedEnd, traceId, spanId,
                severityNumber, resolvedSeverity, search, serviceName, serviceNamespace, environment,
                resourceFilter, attributeFilter, resolvedPageIndex, resolvedPageSize,
                Boolean.TRUE.equals(hideInternal), Boolean.TRUE.equals(hideNoise));
        return Map.of("content", page.getContent().stream().map(this::logRow).toList(),
                "pageIndex", page.getNumber(), "pageSize", page.getSize(),
                "totalElements", page.getTotalElements(), "totalPages", page.getTotalPages(),
                "start", resolvedStart, "end", resolvedEnd);
    }

    private Map<String, Object> logRow(LogEntry log) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("timeUnixNano", log.getTimeUnixNano());
        row.put("observedTimeUnixNano", log.getObservedTimeUnixNano());
        row.put("severityNumber", log.getSeverityNumber());
        row.put("severityText", log.getSeverityText());
        String body = AgentRuntimeTextSanitizer.sanitizeAndLimit(
                log.getBody() instanceof String text ? text : JsonUtil.toJson(log.getBody()), 4096);
        row.put("body", body);
        row.put("traceId", log.getTraceId());
        row.put("spanId", log.getSpanId());
        row.put("traceFlags", log.getTraceFlags());
        String attributes = AgentRuntimeTextSanitizer.sanitizeAndLimit(JsonUtil.toJson(log.getAttributes()), 4096);
        row.put("attributes", attributes);
        String resource = AgentRuntimeTextSanitizer.sanitizeAndLimit(JsonUtil.toJson(log.getResource()), 2048);
        row.put("resource", resource);
        return row;
    }

    private void validateRange(long start, long end) {
        if (start < 0 || end <= start || end - start > MAX_RANGE_MILLIS) {
            throw new IllegalArgumentException("Log time range must be positive, ordered, and no longer than 7 days");
        }
    }

    private void validateText(String value, int maximumLength, String field) {
        if (value != null && (value.length() > maximumLength
                || value.codePoints().anyMatch(code -> code < 32 || code == 127))) {
            throw new IllegalArgumentException(field + " is invalid");
        }
    }

    private String workspaceId() {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (!StringUtils.hasText(workspaceId)) {
            throw new CommonException("log_workspace_unavailable");
        }
        return AuthTokenScopes.normalizeWorkspaceId(workspaceId);
    }
}
