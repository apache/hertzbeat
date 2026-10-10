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

package org.apache.hertzbeat.observability.logs.controller;

import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import org.apache.hertzbeat.observability.logs.service.impl.LogTrendIntervalPlanner;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogQuerySet;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogSubquery;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;
import org.apache.hertzbeat.common.observability.dto.log.LogTransactions;
import org.apache.hertzbeat.observability.logs.query.LogTransactionParser;
import org.apache.hertzbeat.common.observability.dto.log.LogSeverityCategory;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.common.entity.dto.PageResponse;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationWindow;
import org.apache.hertzbeat.common.observability.dto.investigation.LogInvestigationView;
import org.apache.hertzbeat.common.observability.dto.log.HistoricalLogRow;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.apache.hertzbeat.observability.investigation.service.LogInvestigationReadModelService;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.logs.query.LogAttributeFilterParser;
import org.apache.hertzbeat.observability.logs.query.LogSearchParser;
import org.apache.hertzbeat.observability.logs.query.LogGroupSelectionParser;
import org.apache.hertzbeat.observability.logs.query.LogNumericRangeParser;
import org.apache.hertzbeat.observability.logs.query.LogAnalysisGroupingParser;
import org.apache.hertzbeat.observability.logs.query.LogComparisonParser;
import org.apache.hertzbeat.observability.logs.query.LogQuerySetParser;
import org.apache.hertzbeat.observability.logs.query.LogCalculatedParser;
import org.apache.hertzbeat.observability.logs.query.LogSubqueryParser;
import org.apache.hertzbeat.observability.logs.query.LogSortParser;
import org.apache.hertzbeat.observability.logs.query.LogAnalysisMeasureParser;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.shared.query.CollectorResourceScope;
import org.apache.hertzbeat.observability.shared.query.TelemetryQueryContextScope;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Log query and statistics APIs for UI consumption
 */
@RestController
@RequestMapping(path = "/api/logs", produces = "application/json")
@Tag(name = "Log Query Controller")
public class LogQueryController {

    private static final Pattern LOG_RECORD_UID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}");

    private final LogQueryService logQueryService;
    private final ObservabilityQueryAdmissionService queryAdmissionService;
    private final LogInvestigationReadModelService logInvestigationReadModelService;

    @Autowired
    public LogQueryController(LogQueryService logQueryService,
                              ObservabilityQueryAdmissionService queryAdmissionService,
                              LogInvestigationReadModelService logInvestigationReadModelService) {
        this.logQueryService = logQueryService;
        this.queryAdmissionService = queryAdmissionService;
        this.logInvestigationReadModelService = logInvestigationReadModelService;
    }

    @GetMapping("/transactions")
    public ResponseEntity<Message<LogTransactions.Result>> transactions(@RequestParam Map<String, String> parameters) {
        String workspace = trustedWorkspaceId();
        try {
            var request = LogTransactionParser.request(parameters);
            var query = facetQuery(workspace, parameters);
            var context = transactionContext(parameters);
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.transactions(query, context, request))));
        } catch (LogFilterQueryException exception) {
            throw exception;
        } catch (IllegalArgumentException | ArithmeticException exception) {
            throw new ObservabilityQueryRequestException();
        }
    }

    @GetMapping("/transactions/detail")
    public ResponseEntity<Message<LogTransactions.DetailResult>> transactionDetail(@RequestParam Map<String, String> parameters) {
        String workspace = trustedWorkspaceId();
        try {
            var request = LogTransactionParser.request(parameters);
            var detail = LogTransactionParser.detail(parameters);
            var query = facetQuery(workspace, parameters);
            var context = transactionContext(parameters);
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.transactionDetail(query, context, request, detail))));
        } catch (LogFilterQueryException exception) {
            throw exception;
        } catch (IllegalArgumentException | ArithmeticException exception) {
            throw new ObservabilityQueryRequestException();
        }
    }

    private LogQueryService.ContextFilters transactionContext(Map<String, String> parameters) {
        var context = scopeFilters(null, parameters.get("entityType"), parameters.get("collectorId"), parameters.get("instance"),
                parameters.get("endpoint"), null, null);
        return new LogQueryService.ContextFilters(context.resourceFilter(), context.attributeFilter());
    }

    @GetMapping("/analysis")
    public ResponseEntity<Message<LogAnalysis.Result>> analysis(@RequestParam Map<String, String> parameters) {
        var query = facetQuery(trustedWorkspaceId(), parameters);
        try {
            var request = analysisRequest(parameters);
            LogTrendIntervalPlanner.resolve(query.start(), query.end(), request.intervalMs());
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.analysis(query, request))));
        } catch (LogFilterQueryException exception) {
            throw exception;
        } catch (IllegalArgumentException exception) {
            throw new ObservabilityQueryRequestException();
        }
    }

    @PostMapping(value = "/analysis/compare", consumes = "application/json")
    public ResponseEntity<Message<LogComparison.Result>> compare(@RequestBody String source) {
        String workspace = trustedWorkspaceId();
        try {
            var envelope = LogComparisonParser.parse(source);
            var query = facetQuery(workspace, envelope.parameters());
            var request = analysisRequest(envelope.parameters());
            LogComparisonParser.comparisonWindow(new LogFacets.Window(query.start(), query.end()), envelope.queries());
            LogTrendIntervalPlanner.resolve(query.start(), query.end(), request.intervalMs());
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.compare(query, request,
                    envelope.queries(), envelope.formula()))));
        } catch (LogFilterQueryException exception) {
            throw exception;
        } catch (IllegalArgumentException exception) {
            throw new ObservabilityQueryRequestException();
        }
    }

    @PostMapping(value = "/analysis/queries", consumes = "application/json")
    public ResponseEntity<Message<LogQuerySet.Result>> querySet(@RequestBody String source) {
        String workspace = trustedWorkspaceId();
        try {
            var envelope = LogQuerySetParser.parse(source);
            var query = facetQuery(workspace, envelope.parameters());
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.querySet(query, envelope))));
        } catch (LogFilterQueryException exception) {
            throw exception;
        } catch (LogQuerySet.SeriesBudgetExceeded exceeded) {
            throw new LogFilterQueryException(LogFilterQueryException.Reason.CALCULATED_BUDGET_EXCEEDED);
        } catch (IllegalArgumentException exception) {
            throw new ObservabilityQueryRequestException();
        }
    }

    @PostMapping(value = "/calculated/query", consumes = "application/json")
    public ResponseEntity<Message<LogCalculated.Result>> calculated(@RequestBody String source) {
        String workspace = trustedWorkspaceId();
        try {
            var envelope = LogCalculatedParser.query(source);
            var scoped = new HashMap<>(envelope.parameters());
            if (scoped.containsKey("searchSyntax")) {
                scoped.remove("searchSyntax");
                scoped.remove("search");
            }
            var query = facetQuery(workspace, scoped);
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.calculated(query, envelope))));
        } catch (LogFilterQueryException invalid) {
            throw invalid;
        } catch (org.apache.hertzbeat.common.observability.query.LogCalculatedFormula.ValidationException invalid) {
            if ("budget_exceeded".equals(invalid.code())) {
                throw new LogFilterQueryException(LogFilterQueryException.Reason.CALCULATED_BUDGET_EXCEEDED);
            }
            if ("invalid_pattern".equals(invalid.code())) {
                throw new LogFilterQueryException(LogFilterQueryException.Reason.CALCULATED_INVALID_PATTERN);
            }
            throw new ObservabilityQueryRequestException();
        } catch (IllegalArgumentException invalid) {
            throw new ObservabilityQueryRequestException();
        }
    }

    @PostMapping(value = "/subquery/query", consumes = "application/json")
    public ResponseEntity<Message<LogSubquery.Result>> subquery(@RequestBody String source) {
        String workspace = trustedWorkspaceId();
        try {
            var envelope = LogSubqueryParser.parse(source);
            var scoped = new HashMap<>(envelope.parameters());
            scoped.remove("searchSyntax");
            scoped.remove("search");
            var query = facetQuery(workspace, scoped);
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.subquery(query, envelope))));
        } catch (LogFilterQueryException invalid) {
            throw invalid;
        } catch (IllegalArgumentException invalid) {
            throw new ObservabilityQueryRequestException();
        }
    }

    @PostMapping(value = "/calculated/validate", consumes = "application/json")
    public ResponseEntity<Message<LogCalculated.Validation>> validateCalculated(@RequestBody String source) {
        trustedWorkspaceId();
        try {
            var request = LogCalculatedParser.validationRequest(source);
            LogCalculated.Preview preview = request.definitions().fields().stream()
                    .noneMatch(LogQueryController::needsNativeValidation) ? null
                    : executeQuery(() -> nativeCalculatedValidation(request));
            return ResponseEntity.ok(Message.success(new LogCalculated.Validation(2, true,
                    request.definitions(), preview, List.of())));
        } catch (LogCalculatedParser.StructureException invalid) {
            throw new ObservabilityQueryRequestException();
        } catch (org.apache.hertzbeat.common.observability.query.LogCalculatedFormula.ValidationException invalid) {
            return ResponseEntity.ok(Message.success(new LogCalculated.Validation(2, false, null, null,
                    List.of(new LogCalculated.Error(invalid.path(), invalid.code())))));
        } catch (IllegalArgumentException invalid) {
            return ResponseEntity.ok(Message.success(new LogCalculated.Validation(2, false, null, null,
                    List.of(new LogCalculated.Error("calculatedFields", "invalid_expression")))));
        }
    }

    private static boolean needsNativeValidation(LogCalculated.Definition field) {
        return "extraction".equals(field.kind()) || "formula".equals(field.kind())
                && !LogCalculatedFormula.nativePatterns(LogCalculatedFormula.parse(field.expression())).isEmpty();
    }

    private LogCalculated.Preview nativeCalculatedValidation(LogCalculatedParser.ValidationRequest request) {
        LogCalculated.Preview preview = null;
        for (int index = 0; index < request.definitions().fields().size(); index++) {
            var definition = request.definitions().fields().get(index);
            if ("formula".equals(definition.kind())) {
                for (String pattern : LogCalculatedFormula.nativePatterns(
                        LogCalculatedFormula.parse(definition.expression()))) {
                    try { logQueryService.calculatedPattern(pattern); }
                    catch (org.apache.hertzbeat.common.observability.query.LogCalculatedFormula.ValidationException invalid) {
                        throw invalid.at("fields[" + index + "].expression");
                    }
                }
                continue;
            }
            if (!"extraction".equals(definition.kind())) { continue; }
            boolean selected = definition.id().equals(request.previewId());
            try {
                var checked = logQueryService.calculatedPreview(definition,
                        selected ? request.sourceText() : "");
                if (selected) { preview = checked; }
            } catch (org.apache.hertzbeat.common.observability.query.LogCalculatedFormula.ValidationException invalid) {
                throw invalid.at("fields[" + index + "].pattern");
            }
        }
        return preview;
    }

    private LogAnalysis.Request analysisRequest(Map<String, String> parameters) {
        var grouping = LogAnalysisGroupingParser.parse(parameters.get("grouping"));
        if (grouping != null && (parameters.containsKey("field") || parameters.containsKey("limit"))) {
            throw new IllegalArgumentException("Conflicting grouping controls");
        }
        var field = parameters.containsKey("field") ? LogFacets.Field.parse(parameters.get("field")) : null;
        var measure = LogAnalysisMeasureParser.parse(parameters.get("measure"));
        Long interval = null;
        if (parameters.containsKey("intervalMs")) {
            String value = parameters.get("intervalMs");
            if (value == null || !value.matches("[1-9][0-9]{0,8}")) { throw new IllegalArgumentException("Invalid analysis interval"); }
            interval = Long.valueOf(value);
        }
        return new LogAnalysis.Request(field, parameters.getOrDefault("view", "groups"),
                grouping == null ? Integer.parseInt(parameters.getOrDefault("limit", "20")) : grouping.limit(),
                parameters.getOrDefault("order", measure == null ? "count-desc" : "measure-desc"),
                Long.parseLong(parameters.getOrDefault("minCount", "1")), measure, grouping, interval,
                LogAnalysisMeasureParser.parseAdditional(parameters.get("additionalMeasures")), parameters.get("transform"));
    }

    @GetMapping("/facets/fields")
    public ResponseEntity<Message<LogFacets.Fields>> facetFields(@RequestParam Map<String, String> parameters) {
        String workspace = trustedWorkspaceId();
        var query = facetQuery(workspace, parameters);
        try {
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.facetFields(query))));
        } catch (LogFilterQueryException exception) {
            throw exception;
        } catch (IllegalArgumentException exception) {
            throw new ObservabilityQueryRequestException();
        }
    }

    @GetMapping("/facets/values")
    public ResponseEntity<Message<LogFacets.Values>> facetValues(@RequestParam Map<String, String> parameters) {
        String workspace = trustedWorkspaceId();
        try {
            String lookup = LogFacets.normalizeValueSearch(parameters.get("valueSearch"));
            var query = facetQuery(workspace, parameters);
            var field = LogFacets.Field.parse(parameters.get("field"));
            int limit = parameters.containsKey("limit") ? Integer.parseInt(parameters.get("limit")) : 20;
            if (limit < 1 || limit > 100) {
                throw new ObservabilityQueryRequestException();
            }
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.facetValues(query, field, limit, lookup))));
        } catch (LogFilterQueryException exception) {
            throw exception;
        } catch (IllegalArgumentException exception) {
            throw new ObservabilityQueryRequestException();
        }
    }

    private LogQueryService.FacetQuery facetQuery(String workspace, Map<String, String> parameters) {
        try {
            LogSearchParser.validateQuery(parameters.get("searchSyntax"), parameters.get("search"));
            LogGroupSelectionParser.parse(parameters.get("logGroupSelection"));
            LogNumericRangeParser.parse(parameters.get("logNumericRange"));
            long start = Long.parseLong(parameters.get("start"));
            long end = Long.parseLong(parameters.get("end"));
            new LogFacets.Window(start, end);
            Long entityId = parameters.containsKey("entityId") ? Long.valueOf(parameters.get("entityId")) : null;
            if (entityId != null && entityId <= 0) {
                throw new ObservabilityQueryRequestException();
            }
            var filters = scopeFilters(entityId, parameters.get("entityType"), parameters.get("collectorId"),
                    parameters.get("instance"), parameters.get("endpoint"), parameters.get("resourceFilter"),
                    parameters.get("attributeFilter"));
            Integer severity = parameters.containsKey("severityNumber") ? Integer.valueOf(parameters.get("severityNumber")) : null;
            if (severity != null && (severity < 1 || severity > 24)) {
                throw new ObservabilityQueryRequestException();
            }
            return new LogQueryService.FacetQuery(workspace, entityId, start, end, parameters.get("traceId"),
                    parameters.get("spanId"), severity, parameters.get("severityText"),
                    parseSeverityCategory(parameters.get("severityCategory")), parameters.get("search"),
                    parameters.get("serviceName"), parameters.get("serviceNamespace"), parameters.get("environment"),
                    filters.resourceFilter(), filters.attributeFilter(), facetBoolean(parameters, "hideInternal"),
                    facetBoolean(parameters, "hideNoise"), parameters.get("searchSyntax"), parameters.get("logGroupSelection"), parameters.get("logNumericRange"));
        } catch (LogFilterQueryException exception) {
            throw exception;
        } catch (IllegalArgumentException exception) {
            throw new ObservabilityQueryRequestException();
        }
    }

    private static boolean facetBoolean(Map<String, String> parameters, String key) {
        String value = parameters.getOrDefault(key, "false");
        if (!"true".equalsIgnoreCase(value) && !"false".equalsIgnoreCase(value)) {
            throw new ObservabilityQueryRequestException();
        }
        boolean enabled = Boolean.parseBoolean(value);
        if (enabled && "hideInternal".equals(key)
                && TelemetrySourceContext.isSelf()) {
            throw new ObservabilityQueryRequestException();
        }
        return enabled;
    }

    @GetMapping("/list")
    @Operation(summary = "Query logs by time range with optional filters",
            description = "Query logs by [start,end] in ms and optional filters with pagination. Returns paginated log entries sorted by timestamp and persisted UID, newest or oldest first.")
    public ResponseEntity<Message<PageResponse<HistoricalLogRow>>> list(
            @Parameter(description = "Observed entity ID for entity-first context resolution", example = "87584674384")
            @RequestParam(value = "entityId", required = false) Long entityId,
            @Parameter(description = "Observed entity type for entity-first resource filtering", example = "service")
            @RequestParam(value = "entityType", required = false) String entityType,
            @Parameter(description = "Start timestamp in milliseconds (Unix timestamp)", example = "1640995200000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "End timestamp in milliseconds (Unix timestamp)", example = "1641081600000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "Trace ID for distributed tracing", example = "1234567890abcdef")
            @RequestParam(value = "traceId", required = false) String traceId,
            @Parameter(description = "Span ID for distributed tracing", example = "abcdef1234567890")
            @RequestParam(value = "spanId", required = false) String spanId,
            @Parameter(description = "Log severity number (1-24 according to OpenTelemetry standard)", example = "9")
            @RequestParam(value = "severityNumber", required = false) Integer severityNumber,
            @Parameter(description = "Exact source log severity text", example = "INFO")
            @RequestParam(value = "severityText", required = false) String severityText,
            @Parameter(description = "OpenTelemetry severity category (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)")
            @RequestParam(value = "severityCategory", required = false) String severityCategory,
            @Parameter(description = "Log content search keyword", example = "error")
            @RequestParam(value = "search", required = false) String search,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Page index starting from 0", example = "0")
            @RequestParam(value = "pageIndex", required = false, defaultValue = "0") Integer pageIndex,
            @Parameter(description = "Number of items per page", example = "20")
            @RequestParam(value = "pageSize", required = false, defaultValue = "20") Integer pageSize,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise,
            @RequestParam(value = "sort", required = false, defaultValue = "newest") String sort,
            @RequestParam(value = "searchSyntax", required = false) String searchSyntax,
            @RequestParam(value = "logGroupSelection", required = false) String logGroupSelection,
            @RequestParam(value = "logSort", required = false) String logSort,
            @RequestParam(value = "logNumericRange", required = false) String logNumericRange) {
        LogSort descriptor;
        try { descriptor = LogSortParser.parse(logSort); }
        catch (IllegalArgumentException invalid) { throw new ObservabilityQueryRequestException(); }
        if (descriptor != null && !"newest".equals(sort)) { throw new ObservabilityQueryRequestException(); }
        LogSearchParser.validateQuery(searchSyntax, search);
        LogGroupSelectionParser.parse(logGroupSelection);
        LogNumericRangeParser.parse(logNumericRange);
        String workspaceId = trustedWorkspaceId();
        if (!java.util.List.of("newest", "oldest").contains(sort)) {
            throw new ObservabilityQueryRequestException();
        }
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        if (descriptor != null || LogSearchParser.SYNTAX.equals(searchSyntax) || logGroupSelection != null || logNumericRange != null) {
            var query = new LogQueryService.FacetQuery(workspaceId, entityId, start, end, traceId, spanId,
                    severityNumber, severityText, parseSeverityCategory(severityCategory), search,
                    serviceName, serviceNamespace, environment, scopedFilters.resourceFilter(), scopedFilters.attributeFilter(),
                    hideInternal, hideNoise, searchSyntax, logGroupSelection, logNumericRange);
            var rows = executeQuery(() -> descriptor == null
                    ? logQueryService.structuredList(query, pageIndex, pageSize, sort)
                    : logQueryService.sortedList(query, pageIndex, pageSize, descriptor));
            return ResponseEntity.ok(Message.success(PageResponse.from(rows.map(HistoricalLogRow::from))));
        }
        Page<LogEntry> result = executeQuery(() -> logQueryService.list(
                workspaceId, entityId, start, end, traceId, spanId,
                severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, scopedFilters.resourceFilter(), scopedFilters.attributeFilter(),
                pageIndex, pageSize, hideInternal, hideNoise, parseSeverityCategory(severityCategory), sort));
        return ResponseEntity.ok(Message.success(PageResponse.from(result.map(HistoricalLogRow::from))));
    }

    @GetMapping("/context")
    @Operation(summary = "Query one bounded Log investigation")
    public ResponseEntity<Message<LogInvestigationView>> context(
            @RequestParam("logRecordUid") String logRecordUid,
            @RequestParam("start") long start,
            @RequestParam("end") long end,
            @RequestParam(value = "logGroupSelection", required = false) String logGroupSelection,
            @RequestParam(value = "logNumericRange", required = false) String logNumericRange) {
        if (logNumericRange != null) { throw new LogFilterQueryException(); }
        if (logGroupSelection != null) {
            throw new LogFilterQueryException(LogFilterQueryException.Reason.GROUP_SELECTION_UNSUPPORTED);
        }
        validateInvestigationSelection(logRecordUid, start, end);
        String workspaceId = trustedWorkspaceId();
        return ResponseEntity.ok(Message.success(executeQuery(() ->
                logInvestigationReadModelService.query(workspaceId, logRecordUid, start, end))));
    }

    private static void validateInvestigationSelection(String logRecordUid, long start, long end) {
        if (logRecordUid == null || !LOG_RECORD_UID.matcher(logRecordUid).matches()) {
            throw new IllegalArgumentException("logRecordUid has an invalid format");
        }
        new InvestigationWindow(start, end);
    }

    @GetMapping("/stats/overview")
    @Operation(summary = "Log overview statistics",
            description = "Overall counts and basic statistics with filters. Provides counts by severity levels according to OpenTelemetry standard.")
    public ResponseEntity<Message<Map<String, Object>>> overviewStats(
            @Parameter(description = "Observed entity ID for entity-first context resolution", example = "87584674384")
            @RequestParam(value = "entityId", required = false) Long entityId,
            @Parameter(description = "Observed entity type for entity-first resource filtering", example = "service")
            @RequestParam(value = "entityType", required = false) String entityType,
            @Parameter(description = "Start timestamp in milliseconds (Unix timestamp)", example = "1640995200000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "End timestamp in milliseconds (Unix timestamp)", example = "1641081600000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "Trace ID for distributed tracing", example = "1234567890abcdef")
            @RequestParam(value = "traceId", required = false) String traceId,
            @Parameter(description = "Span ID for distributed tracing", example = "abcdef1234567890")
            @RequestParam(value = "spanId", required = false) String spanId,
            @Parameter(description = "Log severity number (1-24 according to OpenTelemetry standard)", example = "9")
            @RequestParam(value = "severityNumber", required = false) Integer severityNumber,
            @Parameter(description = "Exact source log severity text", example = "INFO")
            @RequestParam(value = "severityText", required = false) String severityText,
            @Parameter(description = "OpenTelemetry severity category (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)")
            @RequestParam(value = "severityCategory", required = false) String severityCategory,
            @Parameter(description = "Log content search keyword", example = "error")
            @RequestParam(value = "search", required = false) String search,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise,
            @RequestParam(value = "searchSyntax", required = false) String searchSyntax,
            @RequestParam(value = "logGroupSelection", required = false) String logGroupSelection,
            @RequestParam(value = "logNumericRange", required = false) String logNumericRange) {
        LogSearchParser.validateQuery(searchSyntax, search);
        LogGroupSelectionParser.parse(logGroupSelection);
        LogNumericRangeParser.parse(logNumericRange);
        String workspaceId = trustedWorkspaceId();
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        if (LogSearchParser.SYNTAX.equals(searchSyntax) || logGroupSelection != null || logNumericRange != null) {
            var query = new LogQueryService.FacetQuery(workspaceId, entityId, start, end, traceId, spanId,
                    severityNumber, severityText, parseSeverityCategory(severityCategory), search,
                    serviceName, serviceNamespace, environment, scopedFilters.resourceFilter(), scopedFilters.attributeFilter(),
                    hideInternal, hideNoise, searchSyntax, logGroupSelection, logNumericRange);
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.structuredOverview(query))));
        }
        return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.overviewStats(
                workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, scopedFilters.resourceFilter(), scopedFilters.attributeFilter(),
                hideInternal, hideNoise, parseSeverityCategory(severityCategory)))));
    }

    @GetMapping("/stats/trace-coverage")
    @Operation(summary = "Trace coverage statistics",
            description = "Statistics about trace information availability. Shows how many logs have trace IDs, span IDs, or both for distributed tracing analysis.")
    public ResponseEntity<Message<Map<String, Object>>> traceCoverageStats(
            @Parameter(description = "Observed entity ID for entity-first context resolution", example = "87584674384")
            @RequestParam(value = "entityId", required = false) Long entityId,
            @Parameter(description = "Observed entity type for entity-first resource filtering", example = "service")
            @RequestParam(value = "entityType", required = false) String entityType,
            @Parameter(description = "Start timestamp in milliseconds (Unix timestamp)", example = "1640995200000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "End timestamp in milliseconds (Unix timestamp)", example = "1641081600000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "Trace ID for distributed tracing", example = "1234567890abcdef")
            @RequestParam(value = "traceId", required = false) String traceId,
            @Parameter(description = "Span ID for distributed tracing", example = "abcdef1234567890")
            @RequestParam(value = "spanId", required = false) String spanId,
            @Parameter(description = "Log severity number (1-24 according to OpenTelemetry standard)", example = "9")
            @RequestParam(value = "severityNumber", required = false) Integer severityNumber,
            @Parameter(description = "Exact source log severity text", example = "INFO")
            @RequestParam(value = "severityText", required = false) String severityText,
            @Parameter(description = "OpenTelemetry severity category (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)")
            @RequestParam(value = "severityCategory", required = false) String severityCategory,
            @Parameter(description = "Log content search keyword", example = "error")
            @RequestParam(value = "search", required = false) String search,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise,
            @RequestParam(value = "searchSyntax", required = false) String searchSyntax,
            @RequestParam(value = "logGroupSelection", required = false) String logGroupSelection,
            @RequestParam(value = "logNumericRange", required = false) String logNumericRange) {
        LogSearchParser.validateQuery(searchSyntax, search);
        LogGroupSelectionParser.parse(logGroupSelection);
        LogNumericRangeParser.parse(logNumericRange);
        String workspaceId = trustedWorkspaceId();
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        if (LogSearchParser.SYNTAX.equals(searchSyntax) || logGroupSelection != null || logNumericRange != null) {
            var query = new LogQueryService.FacetQuery(workspaceId, entityId, start, end, traceId, spanId,
                    severityNumber, severityText, parseSeverityCategory(severityCategory), search,
                    serviceName, serviceNamespace, environment, scopedFilters.resourceFilter(), scopedFilters.attributeFilter(),
                    hideInternal, hideNoise, searchSyntax, logGroupSelection, logNumericRange);
            return ResponseEntity.ok(Message.success(Map.of("traceCoverage", executeQuery(() -> logQueryService.structuredTraceCoverage(query)))));
        }
        return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.traceCoverageStats(
                workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, scopedFilters.resourceFilter(), scopedFilters.attributeFilter(),
                hideInternal, hideNoise, parseSeverityCategory(severityCategory)))));
    }

    @GetMapping("/stats/trend")
    @Operation(summary = "Log trend over time",
            description = "Count logs with filters using an adaptive, epoch-aligned time interval.")
    public ResponseEntity<Message<LogTrend>> trendStats(
            @Parameter(description = "Observed entity ID for entity-first context resolution", example = "87584674384")
            @RequestParam(value = "entityId", required = false) Long entityId,
            @Parameter(description = "Observed entity type for entity-first resource filtering", example = "service")
            @RequestParam(value = "entityType", required = false) String entityType,
            @Parameter(description = "Start timestamp in milliseconds (Unix timestamp)", example = "1640995200000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "End timestamp in milliseconds (Unix timestamp)", example = "1641081600000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "Trace ID for distributed tracing", example = "1234567890abcdef")
            @RequestParam(value = "traceId", required = false) String traceId,
            @Parameter(description = "Span ID for distributed tracing", example = "abcdef1234567890")
            @RequestParam(value = "spanId", required = false) String spanId,
            @Parameter(description = "Log severity number (1-24 according to OpenTelemetry standard)", example = "9")
            @RequestParam(value = "severityNumber", required = false) Integer severityNumber,
            @Parameter(description = "Exact source log severity text", example = "INFO")
            @RequestParam(value = "severityText", required = false) String severityText,
            @Parameter(description = "OpenTelemetry severity category (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)")
            @RequestParam(value = "severityCategory", required = false) String severityCategory,
            @Parameter(description = "Log content search keyword", example = "error")
            @RequestParam(value = "search", required = false) String search,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise,
            @RequestParam(value = "searchSyntax", required = false) String searchSyntax,
            @RequestParam(value = "logGroupSelection", required = false) String logGroupSelection,
            @RequestParam(value = "logNumericRange", required = false) String logNumericRange) {
        LogSearchParser.validateQuery(searchSyntax, search);
        LogGroupSelectionParser.parse(logGroupSelection);
        LogNumericRangeParser.parse(logNumericRange);
        String workspaceId = trustedWorkspaceId();
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        if (LogSearchParser.SYNTAX.equals(searchSyntax) || logGroupSelection != null || logNumericRange != null) {
            var query = new LogQueryService.FacetQuery(workspaceId, entityId, start, end, traceId, spanId,
                    severityNumber, severityText, parseSeverityCategory(severityCategory), search,
                    serviceName, serviceNamespace, environment, scopedFilters.resourceFilter(), scopedFilters.attributeFilter(),
                    hideInternal, hideNoise, searchSyntax, logGroupSelection, logNumericRange);
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.structuredTrend(query))));
        }
        return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.trendStats(
                workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, scopedFilters.resourceFilter(), scopedFilters.attributeFilter(),
                hideInternal, hideNoise, parseSeverityCategory(severityCategory)))));
    }

    @GetMapping("/stats/group-by")
    @Operation(summary = "Log field group statistics",
            description = "Count logs grouped by a resource attribute, log attribute, or supported native log field.")
    public ResponseEntity<Message<Map<String, Object>>> groupByStats(
            @Parameter(description = "Observed entity ID for entity-first context resolution", example = "87584674384")
            @RequestParam(value = "entityId", required = false) Long entityId,
            @Parameter(description = "Observed entity type for entity-first resource filtering", example = "service")
            @RequestParam(value = "entityType", required = false) String entityType,
            @Parameter(description = "Start timestamp in milliseconds (Unix timestamp)", example = "1640995200000")
            @RequestParam(value = "start", required = false) Long start,
            @Parameter(description = "End timestamp in milliseconds (Unix timestamp)", example = "1641081600000")
            @RequestParam(value = "end", required = false) Long end,
            @Parameter(description = "Trace ID for distributed tracing", example = "1234567890abcdef")
            @RequestParam(value = "traceId", required = false) String traceId,
            @Parameter(description = "Span ID for distributed tracing", example = "abcdef1234567890")
            @RequestParam(value = "spanId", required = false) String spanId,
            @Parameter(description = "Log severity number (1-24 according to OpenTelemetry standard)", example = "9")
            @RequestParam(value = "severityNumber", required = false) Integer severityNumber,
            @Parameter(description = "Exact source log severity text", example = "INFO")
            @RequestParam(value = "severityText", required = false) String severityText,
            @Parameter(description = "OpenTelemetry severity category (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)")
            @RequestParam(value = "severityCategory", required = false) String severityCategory,
            @Parameter(description = "Log content search keyword", example = "error")
            @RequestParam(value = "search", required = false) String search,
            @Parameter(description = "OTel service.name resource attribute", example = "checkout")
            @RequestParam(value = "serviceName", required = false) String serviceName,
            @Parameter(description = "OTel service.namespace resource attribute", example = "payments")
            @RequestParam(value = "serviceNamespace", required = false) String serviceNamespace,
            @Parameter(description = "OTel deployment.environment.name resource attribute", example = "prod")
            @RequestParam(value = "environment", required = false) String environment,
            @RequestParam(value = "collectorId", required = false) String collectorId,
            @RequestParam(value = "instance", required = false) String instance,
            @RequestParam(value = "endpoint", required = false) String endpoint,
            @Parameter(description = "Resource attribute filter expression, for example service.version=1.2.3")
            @RequestParam(value = "resourceFilter", required = false) String resourceFilter,
            @Parameter(description = "Log attribute filter expression, for example http.route:/checkout")
            @RequestParam(value = "attributeFilter", required = false) String attributeFilter,
            @Parameter(description = "Group field, for example service.name, resource:service.version, or attribute:http.route")
            @RequestParam(value = "groupBy") String groupBy,
            @Parameter(description = "Maximum number of grouped rows to return", example = "20")
            @RequestParam(value = "limit", required = false) Integer limit,
            @Parameter(description = "Group result order, supported values: count-desc, count-asc", example = "count-desc")
            @RequestParam(value = "orderBy", required = false) String orderBy,
            @Parameter(description = "Minimum log count a group must have before it is returned", example = "5")
            @RequestParam(value = "minCount", required = false) Integer minCount,
            @Parameter(description = "Hide internal workspace infrastructure logs such as collector/exporter self logs", example = "true")
            @RequestParam(value = "hideInternal", required = false, defaultValue = "false") boolean hideInternal,
            @Parameter(description = "Hide demo infrastructure noise logs such as kafka/load-generator when focusing on business requests", example = "true")
            @RequestParam(value = "hideNoise", required = false, defaultValue = "false") boolean hideNoise,
            @RequestParam(value = "searchSyntax", required = false) String searchSyntax,
            @RequestParam(value = "logGroupSelection", required = false) String logGroupSelection,
            @RequestParam(value = "logNumericRange", required = false) String logNumericRange) {
        LogSearchParser.validateQuery(searchSyntax, search);
        LogGroupSelectionParser.parse(logGroupSelection);
        LogNumericRangeParser.parse(logNumericRange);
        String workspaceId = trustedWorkspaceId();
        ScopedFilters scopedFilters = scopeFilters(
                entityId, entityType, collectorId, instance, endpoint, resourceFilter, attributeFilter);
        if (LogSearchParser.SYNTAX.equals(searchSyntax) || logGroupSelection != null || logNumericRange != null) {
            var query = new LogQueryService.FacetQuery(workspaceId, entityId, start, end, traceId, spanId,
                    severityNumber, severityText, parseSeverityCategory(severityCategory), search,
                    serviceName, serviceNamespace, environment, scopedFilters.resourceFilter(), scopedFilters.attributeFilter(),
                    hideInternal, hideNoise, searchSyntax, logGroupSelection, logNumericRange);
            return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.structuredGroups(query, groupBy, limit, orderBy, minCount))));
        }
        return ResponseEntity.ok(Message.success(executeQuery(() -> logQueryService.groupByStats(
                workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, scopedFilters.resourceFilter(),
                scopedFilters.attributeFilter(), groupBy,
                limit, orderBy, minCount, hideInternal, hideNoise, parseSeverityCategory(severityCategory)))));
    }

    private static LogSeverityCategory parseSeverityCategory(String value) {
        try {
            return LogSeverityCategory.parse(value);
        } catch (IllegalArgumentException ex) {
            throw new ObservabilityQueryRequestException();
        }
    }

    private <T> T executeQuery(Supplier<T> query) {
        return queryAdmissionService.execute("logs", query);
    }

    private String mergeEntityContextResourceFilter(Long entityId, String entityType, String resourceFilter) {
        String normalizedResourceFilter = StringUtils.trimWhitespace(resourceFilter);
        String scopedResourceFilter = normalizedResourceFilter;
        if (entityId != null && entityId > 0 && (StringUtils.hasText(scopedResourceFilter)
                ? !scopedResourceFilter.contains(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID)
                : true)) {
            String entityIdFilter = OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID + "=\"" + entityId + "\"";
            scopedResourceFilter = StringUtils.hasText(scopedResourceFilter)
                    ? scopedResourceFilter + " and " + entityIdFilter
                    : entityIdFilter;
        }
        String normalizedEntityType = StringUtils.trimWhitespace(entityType);
        if (!StringUtils.hasText(normalizedEntityType) || !normalizedEntityType.matches("[A-Za-z0-9_.:-]+")) {
            return scopedResourceFilter;
        }
        if (StringUtils.hasText(scopedResourceFilter)
                && scopedResourceFilter.contains(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_TYPE)) {
            return scopedResourceFilter;
        }
        String entityTypeFilter = OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_TYPE + "=\"" + normalizedEntityType + "\"";
        return StringUtils.hasText(scopedResourceFilter)
                ? scopedResourceFilter + " and " + entityTypeFilter
                : entityTypeFilter;
    }

    private String trustedWorkspaceId() {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (!StringUtils.hasText(workspaceId)) {
            throw new TelemetryStorageUnavailableException();
        }
        return AuthTokenScopes.normalizeWorkspaceId(workspaceId);
    }

    private ScopedFilters scopeFilters(Long entityId, String entityType, String collectorId, String instance,
                                       String endpoint, String resourceFilter, String attributeFilter) {
        LogAttributeFilterParser.parse(resourceFilter);
        LogAttributeFilterParser.parse(attributeFilter);
        TelemetryQueryContextScope queryContextScope = new TelemetryQueryContextScope(instance, endpoint);
        String collectorScopedResourceFilter = CollectorResourceScope.apply(
                mergeEntityContextResourceFilter(entityId, entityType, resourceFilter), collectorId);
        return new ScopedFilters(
                queryContextScope.applyResourceFilter(collectorScopedResourceFilter),
                queryContextScope.applyAttributeFilter(attributeFilter));
    }

    private record ScopedFilters(String resourceFilter, String attributeFilter) {
    }
}
