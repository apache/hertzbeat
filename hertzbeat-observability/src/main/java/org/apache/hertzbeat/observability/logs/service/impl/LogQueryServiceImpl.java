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

package org.apache.hertzbeat.observability.logs.service.impl;

import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import org.apache.hertzbeat.common.observability.query.ArithmeticFormulaValidator;
import org.apache.hertzbeat.observability.logs.query.LogComparisonParser;
import org.apache.hertzbeat.common.observability.dto.log.LogComparison;
import org.apache.hertzbeat.common.observability.dto.log.LogQuerySet;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogSubquery;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;
import org.apache.hertzbeat.observability.logs.query.LogQuerySetParser;
import org.apache.hertzbeat.observability.logs.query.LogCalculatedParser;
import org.apache.hertzbeat.observability.logs.query.LogSubqueryParser;
import org.apache.hertzbeat.common.observability.dto.log.LogTransactions;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogSort;
import org.apache.hertzbeat.common.observability.dto.log.LogSeverityCategory;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.observability.logs.query.LogAttributeFilterParser;
import org.apache.hertzbeat.observability.logs.query.LogSearchParser;
import org.apache.hertzbeat.observability.logs.query.LogGroupSelectionParser;
import org.apache.hertzbeat.observability.logs.query.LogNumericRangeParser;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.common.observability.dto.log.LogTrend;
import org.apache.hertzbeat.common.observability.dto.log.LogTrendBucket;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.apache.hertzbeat.observability.logs.query.LogVisibilityFilter;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Default log query service.
 */
@Service
@Slf4j
public class LogQueryServiceImpl implements LogQueryService {

    private static final int DEFAULT_GROUP_BY_LIMIT = 20;
    private static final int MAX_GROUP_BY_LIMIT = 100;
    private static final long MAX_GROUP_BY_MIN_COUNT = 1_000_000L;
    private static final int DEFAULT_LIST_PAGE_INDEX = 0;
    private static final int DEFAULT_LIST_PAGE_SIZE = 20;
    private static final int MAX_LIST_PAGE_SIZE = 1000;
    private static final int DEFAULT_CONTEXT_LIMIT = 10;
    private static final int MAX_CONTEXT_LIMIT = 50;
    private static final long DEFAULT_CONTEXT_WINDOW_MS = 300_000L;

    @Override
    public LogFacets.Fields facetFields(FacetQuery query) {
        LogSearchParser.validateSyntax(query.searchSyntax());
        if (LogSearchParser.SYNTAX.equals(query.searchSyntax()) || query.logGroupSelection() != null || query.logNumericRange() != null) {
            var structured = completeScope(query);
            return structured.isEmpty() ? LogFacets.Fields.empty(new LogFacets.Window(query.start(), query.end()))
                    : structuredRead(reader -> reader.structuredLogFacetFields(structured.get()));
        }
        var scope = facetScope(query);
        var window = new LogFacets.Window(query.start(), query.end());
        if (scope.isEmpty()) {
            return LogFacets.Fields.empty(window);
        }
        for (var reader : historyDataReaders) {
            try {
                return reader.logFacetFields(scope.get());
            } catch (UnsupportedOperationException ignored) {
                // Try the next configured history reader, never sample a fallback count.
            } catch (RuntimeException exception) {
                return LogFacets.Fields.unavailable(window);
            }
        }
        return LogFacets.Fields.unavailable(window);
    }

    @Override
    public LogFacets.Values facetValues(FacetQuery query, LogFacets.Field field, int limit) {
        return facetValues(query, field, limit, null);
    }

    @Override
    public LogFacets.Values facetValues(FacetQuery query, LogFacets.Field field, int limit, String valueSearch) {
        String lookup = LogFacets.normalizeValueSearch(valueSearch);
        LogSearchParser.validateSyntax(query.searchSyntax());
        if (LogSearchParser.SYNTAX.equals(query.searchSyntax()) || query.logGroupSelection() != null || query.logNumericRange() != null) {
            var structured = completeScope(query);
            return structured.isEmpty() ? LogFacets.Values.empty(new LogFacets.Window(query.start(), query.end()), field, lookup)
                    : structuredRead(reader -> lookup == null ? reader.structuredLogFacetValues(structured.get(), field, limit)
                            : reader.structuredLogFacetValues(structured.get(), field, limit, lookup));
        }
        var scope = facetScope(query);
        var window = new LogFacets.Window(query.start(), query.end());
        if (scope.isEmpty()) {
            return LogFacets.Values.empty(window, field, lookup);
        }
        for (var reader : historyDataReaders) {
            try {
                return lookup == null ? reader.logFacetValues(scope.get(), field, limit)
                        : reader.logFacetValues(scope.get(), field, limit, lookup);
            } catch (UnsupportedOperationException ignored) {
                // No limited history-list fallback can stand in for full-window counts.
            } catch (RuntimeException exception) {
                return LogFacets.Values.unavailable(window, field, lookup);
            }
        }
        return LogFacets.Values.unavailable(window, field, lookup);
    }

    private Optional<LogSearchQuery> completeScope(FacetQuery query) {
        LogSearchParser.validateSyntax(query.searchSyntax());
        boolean structured = LogSearchParser.SYNTAX.equals(query.searchSyntax());
        var selection = LogGroupSelectionParser.parse(query.logGroupSelection());
        var expression = LogSearchParser.parse(structured ? query.search() : null);
        TrendWindow window;
        try { window = resolveTrendWindow(query.start(), query.end()); }
        catch (IllegalArgumentException invalid) { throw new ObservabilityQueryRequestException(); }
        var legacyScope = new FacetQuery(query.workspaceId(), query.entityId(), window.start(), window.end(),
                query.traceId(), query.spanId(), query.severityNumber(), query.severityText(), query.severityCategory(), structured ? null : query.search(),
                query.serviceName(), query.serviceNamespace(), query.environment(), query.resourceFilter(), query.attributeFilter(),
                query.hideInternal(), query.hideNoise(), null, null, query.logNumericRange());
        try {
            return facetScope(legacyScope).map(scope -> new LogSearchQuery(scope, expression, selection));
        } catch (LogFilterQueryException invalid) {
            throw invalid;
        } catch (IllegalArgumentException invalid) {
            throw new ObservabilityQueryRequestException();
        }
    }

    private <T> T structuredRead(java.util.function.Function<HistoryDataReader, T> operation) {
        for (var reader : historyDataReaders) {
            try { return operation.apply(reader); }
            catch (UnsupportedOperationException ignored) { /* Try only readers supporting the complete predicate. */ }
            catch (LogFilterQueryException invalid) { throw invalid; }
            catch (org.apache.hertzbeat.common.observability.query.LogCalculatedFormula.ValidationException invalid) {
                throw invalid;
            }
            catch (LogQuerySet.SeriesBudgetExceeded exceeded) { throw exceeded; }
            catch (RuntimeException failure) { throw new TelemetryStorageUnavailableException(); }
        }
        throw new TelemetryStorageUnavailableException();
    }

    @Override
    public LogComparison.Result compare(FacetQuery query, LogAnalysis.Request request,
            List<LogComparisonParser.Query> sources, String formula) {
        if (sources == null || sources.size() != 2 || query.search() != null || query.searchSyntax() != null) {
            throw new ObservabilityQueryRequestException();
        }
        if (formula != null) {
            ArithmeticFormulaValidator.validate(formula, Set.of("a", "b"));
        }
        var expressions = sources.stream().map(source -> {
            LogSearchParser.validateSyntax(source.searchSyntax());
            boolean structured = LogSearchParser.SYNTAX.equals(source.searchSyntax());
            if (!structured && source.search() != null && source.search().length() > 512) { throw new ObservabilityQueryRequestException(); }
            return LogSearchParser.parse(structured ? source.search() : null);
        }).toList();
        var selection = LogGroupSelectionParser.parse(query.logGroupSelection());
        var window = new LogFacets.Window(query.start(), query.end());
        var shiftedWindow = LogComparisonParser.comparisonWindow(window, sources);
        Long offset = sources.getLast().timeShiftMs();
        long interval = LogTrendIntervalPlanner.resolve(window.start(), window.end(), request.intervalMs());
        var scope = facetScope(query);
        if (scope.isEmpty()) {
            return new LogComparison.Result(window, request, 0, 0, false,
                    "timeseries".equals(request.view()) ? interval : null, List.of(), formula, offset, offset == null ? null : shiftedWindow);
        }
        var compiled = new ArrayList<LogComparison.Source>();
        for (int i = 0; i < sources.size(); i++) {
            var source = sources.get(i);
            var trusted = scope.get();
            String literal = LogSearchParser.SYNTAX.equals(source.searchSyntax()) ? null : source.search();
            var sourceWindow = i == 0 ? window : shiftedWindow;
            var population = new LogFacets.Scope(trusted.workspaceId(), sourceWindow.start(), sourceWindow.end(), trusted.traceId(), trusted.spanId(),
                    trusted.severityNumber(), trusted.severityText(), literal, trusted.serviceName(), trusted.serviceNamespace(), trusted.environment(),
                    trusted.resourceFilters(), trusted.attributeFilters(), trusted.excludedServiceNames(), trusted.requireServiceName(), trusted.severityCategory(), trusted.numericRange());
            compiled.add(new LogComparison.Source(population, expressions.get(i), selection));
        }
        return structuredRead(reader -> offset == null
                ? reader.logComparison(compiled.getFirst(), compiled.getLast(), request, interval, formula)
                : reader.logComparison(compiled.getFirst(), compiled.getLast(), request, interval, formula, offset));
    }

    @Override
    public LogQuerySet.Result querySet(FacetQuery query, LogQuerySetParser.Envelope envelope) {
        if (query.search() != null || query.searchSyntax() != null) { throw new ObservabilityQueryRequestException(); }
        var window = new LogFacets.Window(query.start(), query.end());
        String view = envelope.parameters().getOrDefault("view", "groups");
        Long requestedInterval = envelope.parameters().containsKey("intervalMs")
                ? Long.valueOf(envelope.parameters().get("intervalMs")) : null;
        long interval = LogTrendIntervalPlanner.resolve(window.start(), window.end(), requestedInterval);
        var trusted = facetScope(query);
        if (trusted.isEmpty()) {
            var empty = envelope.queries().stream().map(source -> new LogQuerySet.Source(source.refId(), source.alias(),
                    source.visible(), sourceWindow(window, source.timeShiftMs()), 0, false, source.analysis(), List.of())).toList();
            return new LogQuerySet.Result(2, window, "timeseries".equals(view) ? interval : null,
                    LogQuerySet.Executed.from(envelope.queries(), envelope.formulas()), empty, envelope.formulas());
        }
        var selection = LogGroupSelectionParser.parse(query.logGroupSelection());
        var base = new LogComparison.Source(trusted.get(), LogSearchParser.parse(null), selection);
        var populations = new ArrayList<LogQuerySet.Population>();
        for (var source : envelope.queries()) {
            var compiled = querySetSource(base, source, window, selection);
            long shift = source.timeShiftMs() == null ? 0 : source.timeShiftMs();
            if (shift == 0) { LogComparison.validateSources(base, compiled); }
            else { LogComparison.validateShiftedSources(base, compiled, shift); }
            populations.add(new LogQuerySet.Population(source, compiled));
        }
        return structuredRead(reader -> reader.logQuerySet(window, populations, envelope.formulas(), view, interval));
    }

    @Override
    public LogCalculated.Result calculated(FacetQuery query, LogCalculatedParser.Envelope envelope) {
        var window = new LogFacets.Window(query.start(), query.end());
        var selection = LogGroupSelectionParser.parse(query.logGroupSelection());
        var scope = facetScope(query);
        var operation = envelope.operation();
        var executed = new LogCalculated.Executed(envelope.parameters(), envelope.definitions(),
                calculatedOperation(operation));
        if (scope.isEmpty()) {
            return new LogCalculated.Result(2, window, executed, emptyCalculated(operation, window));
        }
        var request = new LogCalculated.Query(scope.get(), envelope.search(), envelope.definitions(), operation, selection);
        return new LogCalculated.Result(2, window, executed, calculatedResult(request, operation));
    }

    @Override
    public LogSubquery.Result subquery(FacetQuery query, LogSubqueryParser.Envelope envelope) {
        var window = new LogFacets.Window(query.start(), query.end());
        var operation = envelope.operation();
        var executed = new LogSubquery.Executed(envelope.parameters(), envelope.filter().descriptor(),
                calculatedOperation(operation));
        var scope = facetScope(query);
        if (scope.isEmpty()) {
            return new LogSubquery.Result(1, window, executed, emptyCalculated(operation, window));
        }
        var selection = LogGroupSelectionParser.parse(query.logGroupSelection());
        var request = new LogCalculated.Query(scope.get(), envelope.search(),
                new LogCalculated.Definitions(2, List.of()), operation, selection, envelope.filter());
        return new LogSubquery.Result(1, window, executed, calculatedResult(request, operation));
    }

    private Map<String, Object> calculatedResult(LogCalculated.Query request, LogCalculated.Operation operation) {
        Map<String, Object> result = switch (operation) {
            case LogCalculated.Page page -> {
                var rows = structuredRead(reader -> reader.calculatedPage(request));
                yield Map.of("kind", "page", "totalElements", rows.totalElements(), "rows", rows.rows());
            }
            case LogCalculated.Trend trend -> {
                var buckets = structuredRead(reader -> reader.calculatedTrend(request));
                yield Map.of("kind", "trend", "intervalMs", trend.intervalMs(),
                        "matchingTotal", buckets.matchingTotal(), "buckets", buckets.buckets());
            }
            case LogCalculated.Facet facet -> {
                var values = structuredRead(reader -> reader.calculatedFacet(request));
                yield calculatedFacetResult(facet, values);
            }
            case LogCalculated.Analysis analysis -> {
                var groups = structuredRead(reader -> reader.calculatedAnalysis(request));
                yield calculatedAnalysisResult(analysis, groups);
            }
        };
        return result;
    }

    @Override
    public LogCalculated.Preview calculatedPreview(LogCalculated.Definition definition, String sample) {
        return structuredRead(reader -> reader.calculatedPreview(definition, sample));
    }

    @Override
    public void calculatedPattern(String pattern) {
        structuredRead(reader -> {
            reader.calculatedPattern(pattern);
            return Boolean.TRUE;
        });
    }

    private static Map<String, Object> calculatedOperation(LogCalculated.Operation operation) {
        if (operation instanceof LogCalculated.Trend trend) {
            return Map.of("kind", "trend", "intervalMs", trend.intervalMs());
        }
        if (operation instanceof LogCalculated.Facet facet) {
            var result = new HashMap<String, Object>();
            result.put("kind", "facet");
            result.put("field", facet.field());
            result.put("limit", facet.limit());
            if (facet.valueSearch() != null) { result.put("valueSearch", facet.valueSearch()); }
            return result;
        }
        if (operation instanceof LogCalculated.Analysis analysis) {
            var result = new HashMap<String, Object>();
            result.put("kind", "analysis");
            result.put("view", analysis.view());
            result.put("grouping", analysis.grouping());
            result.put("measure", analysis.measure());
            result.put("limit", analysis.limit());
            result.put("order", analysis.order());
            result.put("minCount", analysis.minCount());
            if (analysis.intervalMs() != null) { result.put("intervalMs", analysis.intervalMs()); }
            return result;
        }
        var page = (LogCalculated.Page) operation;
        var sort = new HashMap<String, Object>();
        sort.put("field", page.sort().field());
        sort.put("direction", page.sort().direction());
        if (page.sort().type() != null) { sort.put("type", page.sort().type()); }
        return Map.of("kind", "page", "pageIndex", page.pageIndex(),
                "pageSize", page.pageSize(), "sort", sort);
    }

    private static Map<String, Object> calculatedFacetResult(LogCalculated.Facet facet,
                                                             LogCalculated.FacetResult values) {
        var result = new HashMap<String, Object>();
        result.put("kind", "facet");
        result.put("field", facet.field());
        result.put("matchingTotal", values.matchingTotal());
        result.put("missingOrNullCount", values.missingOrNullCount());
        result.put("values", values.values());
        result.put("truncated", values.truncated());
        if (facet.valueSearch() != null) {
            result.put("search", Map.of("query", facet.valueSearch(), "matchedCount", values.searchMatchedCount()));
        }
        return result;
    }

    private static Map<String, Object> calculatedAnalysisResult(LogCalculated.Analysis analysis,
                                                                LogCalculated.AnalysisResult groups) {
        var result = new HashMap<String, Object>();
        result.put("kind", "analysis");
        result.put("view", analysis.view());
        result.put("matchingTotal", groups.matchingTotal());
        result.put("truncated", groups.truncated());
        result.put("intervalMs", analysis.intervalMs());
        result.put("groups", groups.groups());
        return result;
    }

    private static Map<String, Object> emptyCalculated(LogCalculated.Operation operation, LogFacets.Window window) {
        return switch (operation) {
            case LogCalculated.Page ignored -> Map.of("kind", "page", "totalElements", 0, "rows", List.of());
            case LogCalculated.Trend trend -> {
                var buckets = new ArrayList<LogTrendBucket>();
                long interval = trend.intervalMs();
                for (long start = Math.floorDiv(window.start(), interval) * interval;
                     start <= Math.floorDiv(window.end(), interval) * interval; start += interval) {
                    buckets.add(new LogTrendBucket(start, 0));
                }
                yield Map.of("kind", "trend", "intervalMs", interval, "matchingTotal", 0, "buckets", buckets);
            }
            case LogCalculated.Facet facet -> calculatedFacetResult(facet,
                    new LogCalculated.FacetResult(0, 0, List.of(), false,
                            facet.valueSearch() == null ? null : 0L));
            case LogCalculated.Analysis analysis -> calculatedAnalysisResult(analysis,
                    new LogCalculated.AnalysisResult(0, false, List.of()));
        };
    }

    private LogComparison.Source querySetSource(LogComparison.Source base, LogQuerySet.Query query,
                                                LogFacets.Window window, LogGroupSelection selection) {
        var trusted = base.scope();
        var shifted = sourceWindow(window, query.timeShiftMs());
        boolean structured = LogSearchParser.SYNTAX.equals(query.searchSyntax());
        var expression = LogSearchParser.parse(structured ? query.search() : null);
        var scope = new LogFacets.Scope(trusted.workspaceId(), shifted.start(), shifted.end(), trusted.traceId(), trusted.spanId(),
                trusted.severityNumber(), trusted.severityText(), structured ? null : query.search(), trusted.serviceName(),
                trusted.serviceNamespace(), trusted.environment(), trusted.resourceFilters(), trusted.attributeFilters(),
                trusted.excludedServiceNames(), trusted.requireServiceName(), trusted.severityCategory(), trusted.numericRange());
        return new LogComparison.Source(scope, expression, selection);
    }

    private static LogFacets.Window sourceWindow(LogFacets.Window window, Long shift) {
        long amount = shift == null ? 0 : shift;
        return new LogFacets.Window(Math.subtractExact(window.start(), amount), Math.subtractExact(window.end(), amount));
    }

    @Override
    public LogAnalysis.Result analysis(FacetQuery query, LogAnalysis.Request request) {
        LogSearchParser.validateSyntax(query.searchSyntax());
        boolean structured = LogSearchParser.SYNTAX.equals(query.searchSyntax()) || query.logGroupSelection() != null || query.logNumericRange() != null;
        var window = new LogFacets.Window(query.start(), query.end());
        long interval = LogTrendIntervalPlanner.resolve(window.start(), window.end(), request.intervalMs());
        var structuredQuery = structured ? completeScope(query) : Optional.<LogSearchQuery>empty();
        var scope = structured ? structuredQuery.map(LogSearchQuery::scope) : facetScope(query);
        if (scope.isEmpty()) {
            return new LogAnalysis.Result(window, request.field(), request.view(), request.limit(), request.order(),
                    request.minCount(), 0L, false, "timeseries".equals(request.view()) ? interval : null, List.of(),
                    request.measure(), request.grouping(), request.additionalMeasures(), request.transform());
        }
        return structuredQuery.isPresent()
                ? structuredRead(reader -> reader.logAnalysis(structuredQuery.get(), request, interval))
                : structuredRead(reader -> reader.logAnalysis(scope.get(), null, request, interval));
    }

    @Override
    public Page<LogEntry> sortedList(FacetQuery query, Integer pageIndex, Integer pageSize,
            LogSort sort) {
        if (sort == null) { throw new ObservabilityQueryRequestException(); }
        LogSearchParser.validateSyntax(query.searchSyntax());
        boolean structured = LogSearchParser.SYNTAX.equals(query.searchSyntax());
        var expression = LogSearchParser.parse(structured ? query.search() : null);
        if (!structured && query.search() != null && query.search().length() > 512) { throw new ObservabilityQueryRequestException(); }
        var selection = LogGroupSelectionParser.parse(query.logGroupSelection());
        int page = normalizeListPageIndex(pageIndex);
        int size = normalizeListPageSize(pageSize);
        long offset = (long) page * size;
        if (offset > Integer.MAX_VALUE) { throw new ObservabilityQueryRequestException(); }
        var window = resolveTrendWindow(query.start(), query.end());
        var scopeQuery = new FacetQuery(query.workspaceId(), query.entityId(), window.start(), window.end(),
                query.traceId(), query.spanId(), query.severityNumber(), query.severityText(), query.severityCategory(), structured ? null : query.search(),
                query.serviceName(), query.serviceNamespace(), query.environment(), query.resourceFilter(), query.attributeFilter(),
                query.hideInternal(), query.hideNoise(), null, null, query.logNumericRange());
        var scope = facetScope(scopeQuery);
        if (scope.isEmpty()) { return Page.empty(PageRequest.of(page, size)); }
        var source = new LogComparison.Source(scope.get(), expression, selection);
        return structuredRead(reader -> {
            var rows = reader.querySortedLogs(source, (int) offset, size, sort);
            long count = reader.countSortedLogs(source);
            var context = scope.get();
            var guarded = filterQueryLogs(context.workspaceId(), rows, context.serviceName(), context.serviceNamespace(),
                    context.environment(), context.resourceFilters(), context.attributeFilters(), query.hideInternal(), query.hideNoise());
            if (guarded.size() != rows.size()) { throw new TelemetryStorageUnavailableException(); }
            return new PageImpl<>(guarded, PageRequest.of(page, size), count);
        });
    }

    @Override
    public Page<LogEntry> structuredList(FacetQuery query, Integer pageIndex, Integer pageSize, String sort) {
        if (!List.of("newest", "oldest").contains(sort)) { throw new ObservabilityQueryRequestException(); }
        var scope = completeScope(query);
        int page = normalizeListPageIndex(pageIndex);
        int size = normalizeListPageSize(pageSize);
        long offset = (long) page * size;
        if (offset > Integer.MAX_VALUE) { throw new ObservabilityQueryRequestException(); }
        if (scope.isEmpty()) { return Page.empty(PageRequest.of(page, size)); }
        return structuredRead(reader -> {
            var logs = reader.queryStructuredLogs(scope.get(), (int) offset, size, sort);
            long count = reader.countStructuredLogs(scope.get());
            var context = scope.get().scope();
            var guarded = filterQueryLogs(context.workspaceId(), logs, context.serviceName(), context.serviceNamespace(),
                    context.environment(), context.resourceFilters(), context.attributeFilters(), query.hideInternal(), query.hideNoise());
            if (guarded.size() != logs.size()) { throw new TelemetryStorageUnavailableException(); }
            return new PageImpl<>(guarded, PageRequest.of(page, size), count);
        });
    }

    @Override
    public Map<String, Object> structuredOverview(FacetQuery query) {
        var scope = completeScope(query);
        return scope.isEmpty() ? emptyStructuredOverview() : overviewFromAggregate(structuredRead(reader -> reader.structuredLogOverview(scope.get())));
    }

    private Map<String, Object> emptyStructuredOverview() {
        Map<String, Object> result = new HashMap<>();
        for (String key : List.of("totalCount", "fatalCount", "errorCount", "warnCount", "infoCount", "debugCount", "traceCount")) {
            result.put(key, 0L);
        }
        result.put("traceCoverage", traceCoverage(List.of()));
        return result;
    }

    @Override
    public Map<String, Long> structuredTraceCoverage(FacetQuery query) {
        var scope = completeScope(query);
        return scope.isEmpty() ? traceCoverage(List.of()) : structuredRead(reader -> reader.structuredLogTraceCoverage(scope.get()));
    }

    @Override
    public LogTrend structuredTrend(FacetQuery query) {
        var scope = completeScope(query);
        TrendWindow window = scope.isPresent() ? resolveTrendWindow(scope.get().scope().start(), scope.get().scope().end())
                : resolveTrendWindow(query.start(), query.end());
        return new LogTrend(window.start(), window.end(), window.intervalMs(), scope.isEmpty() ? List.of()
                : structuredRead(reader -> reader.structuredLogTrend(scope.get(), window.intervalMs())));
    }

    @Override
    public Map<String, Object> structuredGroups(FacetQuery query, String groupBy, Integer limit, String orderBy, Integer minCount) {
        int resolvedLimit = resolveGroupByLimit(limit);
        long resolvedMinCount = resolveGroupByMinCount(minCount);
        String resolvedOrder = StringUtils.hasText(orderBy) ? orderBy.trim().toLowerCase(java.util.Locale.ROOT) : "count-desc";
        if (!List.of("count-asc", "count-desc").contains(resolvedOrder)) {
            throw new ObservabilityQueryRequestException();
        }
        var scope = completeScope(query);
        return groupByResult(groupBy, scope.isEmpty() ? Map.of()
                : structuredRead(reader -> reader.structuredLogGroups(scope.get(), groupBy, resolvedLimit, resolvedOrder, resolvedMinCount)),
                resolvedLimit, resolvedOrder, resolvedMinCount);
    }

    @Override
    public LogTransactions.Result transactions(FacetQuery query, ContextFilters context, LogTransactions.Request request) {
        var scoped = transactionScope(query, context, request);
        return scoped.map(value -> structuredRead(reader -> reader.logTransactions(value)))
                .orElseGet(() -> new LogTransactions.Result(new LogFacets.Window(query.start(), query.end()), request,
                        0, 0, 0, 0, 0, 0, false, List.of()));
    }

    @Override
    public LogTransactions.DetailResult transactionDetail(FacetQuery query, ContextFilters context,
                                                          LogTransactions.Request request, LogTransactions.Detail detail) {
        java.util.Objects.requireNonNull(detail);
        var scoped = transactionScope(query, context, request);
        if (scoped.isEmpty()) {
            return new LogTransactions.DetailResult(new LogFacets.Window(query.start(), query.end()), request.field(),
                    detail.identity(), false, null, List.of(), detail.offset(), detail.limit(), detail.sort());
        }
        return structuredRead(reader -> {
            var result = reader.logTransactionDetail(scoped.get(), detail);
            var population = scoped.get().population();
            var guardRows = result.rows().stream().map(row -> LogEntry.builder()
                    .resource(row.resource()).attributes(row.attributes()).build()).toList();
            var guarded = filterQueryLogs(population.workspaceId(), guardRows, population.serviceName(),
                    population.serviceNamespace(), population.environment(), population.resourceFilters(),
                    population.attributeFilters(), query.hideInternal(), query.hideNoise());
            if (guarded.size() != result.rows().size()) { throw new TelemetryStorageUnavailableException(); }
            return result;
        });
    }

    private Optional<LogTransactions.Query> transactionScope(FacetQuery query, ContextFilters filters,
                                                            LogTransactions.Request request) {
        java.util.Objects.requireNonNull(request);
        java.util.Objects.requireNonNull(filters);
        LogSearchParser.validateQuery(query.searchSyntax(), query.search());
        boolean structured = LogSearchParser.SYNTAX.equals(query.searchSyntax());
        var expression = structured ? LogSearchParser.parse(query.search()) : new LogSearchExpression.And(List.of());
        var selection = LogGroupSelectionParser.parse(query.logGroupSelection());
        var range = LogNumericRangeParser.parse(query.logNumericRange());
        var resources = parseScopedFilter(query.resourceFilter());
        var attributes = parseScopedFilter(query.attributeFilter());
        var contextResources = parseScopedFilter(filters.resourceFilter());
        var contextAttributes = parseScopedFilter(filters.attributeFilter());
        String workspace = requiredWorkspaceId(query.workspaceId());
        new LogFacets.Window(query.start(), query.end());
        return resolveWorkspaceEntityContext(workspace, query.entityId(), query.serviceName(),
                query.serviceNamespace(), query.environment()).map(context -> {
                    var excluded = hiddenServiceNames(query.hideInternal(), query.hideNoise());
                    boolean required = shouldRequireServiceName(query.hideInternal(), query.hideNoise());
                    var population = new LogFacets.Scope(workspace, query.start(), query.end(), query.traceId(), query.spanId(),
                            null, null, null, context.serviceName(), context.serviceNamespace(), context.environment(),
                            withTrustedEntityScope(query.entityId(), context, contextResources), contextAttributes,
                            excluded, required, null, null);
                    var seed = new LogFacets.Scope(workspace, query.start(), query.end(), query.traceId(), query.spanId(),
                            query.severityNumber(), query.severityText(), structured ? null : query.search(), context.serviceName(),
                            context.serviceNamespace(), context.environment(), withTrustedEntityScope(query.entityId(), context, resources),
                            attributes, excluded, required, query.severityCategory(), range);
                    return new LogTransactions.Query(population, new LogComparison.Source(seed, expression, selection), request);
                });
    }

    private Optional<LogFacets.Scope> facetScope(FacetQuery query) {
        var numericRange = LogNumericRangeParser.parse(query.logNumericRange());
        String workspace = requiredWorkspaceId(query.workspaceId());
        new LogFacets.Window(query.start(), query.end());
        var resources = parseScopedFilter(query.resourceFilter());
        var attributes = parseScopedFilter(query.attributeFilter());
        return resolveWorkspaceEntityContext(workspace, query.entityId(), query.serviceName(),
                query.serviceNamespace(), query.environment()).map(context -> new LogFacets.Scope(workspace,
                query.start(), query.end(), query.traceId(), query.spanId(), query.severityNumber(), query.severityText(),
                query.search(), context.serviceName(), context.serviceNamespace(), context.environment(),
                withTrustedEntityScope(query.entityId(), context, resources), attributes,
                hiddenServiceNames(query.hideInternal(), query.hideNoise()),
                shouldRequireServiceName(query.hideInternal(), query.hideNoise()), query.severityCategory(), numericRange));
    }

    private static final String LOG_FILTER_NEGATION_PREFIX = "!";
    private static final String LOG_FILTER_IN_PREFIX = "__hz_in__:";
    private static final String LOG_FILTER_NOT_IN_PREFIX = "__hz_not_in__:";
    private static final String LOG_FILTER_CONTAINS_PREFIX = "__hz_contains__:";
    private static final String LOG_FILTER_NOT_CONTAINS_PREFIX = "__hz_not_contains__:";
    private static final String LOG_FILTER_EXISTS_PREFIX = "__hz_exists__";
    private static final String LOG_FILTER_NOT_EXISTS_PREFIX = "__hz_not_exists__";
    private static final String LOG_FILTER_VALUE_DELIMITER = "\u001F";
    private static final Set<String> WORKSPACE_RESOURCE_KEYS =
            OtlpResourceSemanticAttributes.HERTZBEAT_WORKSPACE_ID_KEYS;
    private static final Set<String> ENTITY_SCOPE_RESOURCE_KEYS = Set.of(
            "service.name",
            "service.namespace",
            "deployment.environment.name"
    );

    private final List<HistoryDataReader> historyDataReaders;
    private final ObservabilityWorkspaceQueryGateway workspaceQueryGateway;

    @Autowired
    public LogQueryServiceImpl(List<HistoryDataReader> historyDataReaders,
                               Optional<ObservabilityWorkspaceQueryGateway> workspaceQueryGateway) {
        this.historyDataReaders = historyDataReaders == null ? List.of()
                : historyDataReaders.stream().filter(Objects::nonNull).toList();
        this.workspaceQueryGateway = workspaceQueryGateway.orElse(null);
    }

    public LogQueryServiceImpl(List<HistoryDataReader> historyDataReaders) {
        this(historyDataReaders, Optional.empty());
    }

    @Override
    public Page<LogEntry> list(Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        return list(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, null, null,
                pageIndex, pageSize, hideInternal, hideNoise);
    }

    @Override
    public Page<LogEntry> list(Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        String workspaceId = capturedWorkspaceId();
        Map<String, String> resourceFilters = StringUtils.hasText(workspaceId)
                ? parseScopedFilter(resourceFilter) : parseLogAttributeFilter(resourceFilter);
        Map<String, String> attributeFilters = StringUtils.hasText(workspaceId)
                ? parseScopedFilter(attributeFilter) : parseLogAttributeFilter(attributeFilter);
        return getPagedLogs(workspaceId, start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                pageIndex, pageSize, hideInternal, hideNoise, null);
    }

    @Override
    public Page<LogEntry> list(Long entityId, Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        String workspaceId = capturedWorkspaceId();
        if (StringUtils.hasText(workspaceId)) {
            return list(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                    pageIndex, pageSize, hideInternal, hideNoise);
        }
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter));
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter);
        return getPagedLogs(null, start, end, traceId, spanId, severityNumber, severityText, search,
                context.serviceName(), context.serviceNamespace(), context.environment(), resourceFilters, attributeFilters,
                pageIndex, pageSize, hideInternal, hideNoise, null);
    }

    @Override
    public Page<LogEntry> list(String workspaceId, Long entityId, Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise) {
        return list(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search, serviceName,
                serviceNamespace, environment, resourceFilter, attributeFilter, pageIndex, pageSize,
                hideInternal, hideNoise, null);
    }

    @Override
    public Page<LogEntry> list(String workspaceId, Long entityId, Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise,
                               LogSeverityCategory severityCategory) {
        return list(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                pageIndex, pageSize, hideInternal, hideNoise, severityCategory, "newest");
    }

    @Override
    public Page<LogEntry> list(String workspaceId, Long entityId, Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise,
                               LogSeverityCategory severityCategory, String sort) {
        if (!List.of("newest", "oldest").contains(sort)) {
            throw new org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException();
        }
        String scope = requiredWorkspaceId(workspaceId);
        Map<String, String> resourceFilters = parseScopedFilter(resourceFilter);
        Map<String, String> attributeFilters = parseScopedFilter(attributeFilter);
        Optional<LogServiceContext> context = resolveWorkspaceEntityContext(
                scope, entityId, serviceName, serviceNamespace, environment);
        if (context.isEmpty()) {
            return Page.empty();
        }
        Map<String, String> effectiveResourceFilters = withTrustedEntityScope(
                entityId, context.get(), resourceFilters);
        return getPagedLogs(scope, start, end, traceId, spanId, severityNumber, severityText, search,
                context.get().serviceName(), context.get().serviceNamespace(), context.get().environment(),
                effectiveResourceFilters, attributeFilters, pageIndex, pageSize, hideInternal, hideNoise, severityCategory, sort);
    }

    @Override
    public Map<String, Object> overviewStats(Long start, Long end, String traceId, String spanId,
                                             Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             boolean hideInternal, boolean hideNoise) {
        return overviewStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, null, null, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> overviewStats(Long start, Long end, String traceId, String spanId,
                                             Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String attributeFilter,
                                             boolean hideInternal, boolean hideNoise) {
        String workspaceId = capturedWorkspaceId();
        Map<String, String> resourceFilters = StringUtils.hasText(workspaceId)
                ? parseScopedFilter(resourceFilter) : parseLogAttributeFilter(resourceFilter);
        Map<String, String> attributeFilters = StringUtils.hasText(workspaceId)
                ? parseScopedFilter(attributeFilter) : parseLogAttributeFilter(attributeFilter);
        return overviewStatsWithFilters(workspaceId, start, end, traceId, spanId,
                severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise, null);
    }

    @Override
    public Map<String, Object> overviewStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                             Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String attributeFilter,
                                             boolean hideInternal, boolean hideNoise) {
        String workspaceId = capturedWorkspaceId();
        if (StringUtils.hasText(workspaceId)) {
            return overviewStats(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText,
                    search, serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                    hideInternal, hideNoise);
        }
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter));
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter);
        return overviewStatsWithFilters(null, start, end, traceId, spanId, severityNumber, severityText, search,
                context.serviceName(), context.serviceNamespace(), context.environment(), resourceFilters, attributeFilters,
                hideInternal, hideNoise, null);
    }

    @Override
    public Map<String, Object> overviewStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                             String spanId, Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String attributeFilter,
                                             boolean hideInternal, boolean hideNoise) {
        return overviewStats(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search, serviceName,
                serviceNamespace, environment, resourceFilter, attributeFilter, hideInternal, hideNoise,
                null);
    }

    @Override
    public Map<String, Object> overviewStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                             String spanId, Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             String resourceFilter, String attributeFilter,
                                             boolean hideInternal, boolean hideNoise,
                                             LogSeverityCategory severityCategory) {
        String scope = requiredWorkspaceId(workspaceId);
        Map<String, String> resourceFilters = parseScopedFilter(resourceFilter);
        Map<String, String> attributeFilters = parseScopedFilter(attributeFilter);
        Optional<LogServiceContext> context = resolveWorkspaceEntityContext(
                scope, entityId, serviceName, serviceNamespace, environment);
        if (context.isEmpty()) {
            return Map.of();
        }
        return overviewStatsWithFilters(scope, start, end, traceId, spanId, severityNumber, severityText, search,
                context.get().serviceName(), context.get().serviceNamespace(), context.get().environment(),
                withTrustedEntityScope(entityId, context.get(), resourceFilters), attributeFilters,
                hideInternal, hideNoise, severityCategory);
    }

    private Map<String, Object> overviewStatsWithFilters(String workspaceId, Long start, Long end,
                                                         String traceId, String spanId,
                                                         Integer severityNumber, String severityText, String search,
                                                         String serviceName, String serviceNamespace, String environment,
                                                         Map<String, String> resourceFilters,
                                                         Map<String, String> attributeFilters,
                                                         boolean hideInternal, boolean hideNoise,
                                                         LogSeverityCategory severityCategory) {
        if (!hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            Map<String, Long> aggregate = readSeverityBuckets(workspaceId, start, end, traceId, spanId, severityNumber,
                    severityText, search, serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    hideInternal, hideNoise, severityCategory);
            if (aggregate != null) {
                return overviewFromAggregate(aggregate);
            }
        }

        List<LogEntry> logs = getFilteredLogs(workspaceId, start, end, traceId, spanId,
                severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise, severityCategory);

        Map<String, Object> overview = new HashMap<>();
        overview.put("totalCount", logs.size());

        long fatalCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 21 && log.getSeverityNumber() <= 24).count();
        long errorCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 17 && log.getSeverityNumber() <= 20).count();
        long warnCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 13 && log.getSeverityNumber() <= 16).count();
        long infoCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 9 && log.getSeverityNumber() <= 12).count();
        long debugCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 5 && log.getSeverityNumber() <= 8).count();
        long traceCount = logs.stream().filter(log -> log.getSeverityNumber() != null && log.getSeverityNumber() >= 1 && log.getSeverityNumber() <= 4).count();

        overview.put("fatalCount", fatalCount);
        overview.put("errorCount", errorCount);
        overview.put("warnCount", warnCount);
        overview.put("infoCount", infoCount);
        overview.put("debugCount", debugCount);
        overview.put("traceCount", traceCount);
        overview.put("traceCoverage", traceCoverage(logs));

        return overview;
    }

    private Map<String, Object> overviewFromAggregate(Map<String, Long> aggregate) {
        Map<String, Object> overview = new HashMap<>(aggregate);
        Map<String, Long> traceCoverage = new HashMap<>();
        for (String key : List.of("withTrace", "withoutTrace", "withSpan", "withBothTraceAndSpan")) {
            Long value = aggregate.get(key);
            overview.remove(key);
            if (value != null) {
                traceCoverage.put(key, value);
            }
        }
        if (!traceCoverage.isEmpty()) {
            overview.put("traceCoverage", traceCoverage);
        }
        return overview;
    }

    private Map<String, Long> traceCoverage(List<LogEntry> logs) {
        long withTraceId = logs.stream().filter(log -> StringUtils.hasText(log.getTraceId())).count();
        long withSpanId = logs.stream().filter(log -> StringUtils.hasText(log.getSpanId())).count();
        long withBothTraceAndSpan = logs.stream().filter(log ->
                StringUtils.hasText(log.getTraceId()) && StringUtils.hasText(log.getSpanId())).count();
        Map<String, Long> traceCoverage = new HashMap<>();
        traceCoverage.put("withTrace", withTraceId);
        traceCoverage.put("withoutTrace", logs.size() - withTraceId);
        traceCoverage.put("withSpan", withSpanId);
        traceCoverage.put("withBothTraceAndSpan", withBothTraceAndSpan);
        return traceCoverage;
    }

    @Override
    public Map<String, Object> traceCoverageStats(Long start, Long end, String traceId, String spanId,
                                                  Integer severityNumber, String severityText, String search,
                                                  String serviceName, String serviceNamespace, String environment,
                                                  boolean hideInternal, boolean hideNoise) {
        return traceCoverageStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, null, null, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> traceCoverageStats(Long start, Long end, String traceId, String spanId,
                                                  Integer severityNumber, String severityText, String search,
                                                  String serviceName, String serviceNamespace, String environment,
                                                  String resourceFilter, String attributeFilter,
                                                  boolean hideInternal, boolean hideNoise) {
        String workspaceId = capturedWorkspaceId();
        Map<String, String> resourceFilters = StringUtils.hasText(workspaceId)
                ? parseScopedFilter(resourceFilter) : parseLogAttributeFilter(resourceFilter);
        Map<String, String> attributeFilters = StringUtils.hasText(workspaceId)
                ? parseScopedFilter(attributeFilter) : parseLogAttributeFilter(attributeFilter);
        return traceCoverageStatsWithFilters(workspaceId, start, end, traceId, spanId,
                severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise, null);
    }

    @Override
    public Map<String, Object> traceCoverageStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                                  Integer severityNumber, String severityText, String search,
                                                  String serviceName, String serviceNamespace, String environment,
                                                  String resourceFilter, String attributeFilter,
                                                  boolean hideInternal, boolean hideNoise) {
        String workspaceId = capturedWorkspaceId();
        if (StringUtils.hasText(workspaceId)) {
            return traceCoverageStats(workspaceId, entityId, start, end, traceId, spanId, severityNumber,
                    severityText, search, serviceName, serviceNamespace, environment,
                    resourceFilter, attributeFilter, hideInternal, hideNoise);
        }
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter));
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter);
        return traceCoverageStatsWithFilters(null, start, end, traceId, spanId, severityNumber, severityText, search,
                context.serviceName(), context.serviceNamespace(), context.environment(), resourceFilters, attributeFilters,
                hideInternal, hideNoise, null);
    }

    @Override
    public Map<String, Object> traceCoverageStats(String workspaceId, Long entityId, Long start, Long end,
                                                  String traceId, String spanId, Integer severityNumber,
                                                  String severityText, String search, String serviceName,
                                                  String serviceNamespace, String environment,
                                                  String resourceFilter, String attributeFilter,
                                                  boolean hideInternal, boolean hideNoise) {
        return traceCoverageStats(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search, serviceName,
                serviceNamespace, environment, resourceFilter, attributeFilter, hideInternal, hideNoise,
                null);
    }

    @Override
    public Map<String, Object> traceCoverageStats(String workspaceId, Long entityId, Long start, Long end,
                                                  String traceId, String spanId, Integer severityNumber,
                                                  String severityText, String search, String serviceName,
                                                  String serviceNamespace, String environment,
                                                  String resourceFilter, String attributeFilter,
                                                  boolean hideInternal, boolean hideNoise,
                                                  LogSeverityCategory severityCategory) {
        String scope = requiredWorkspaceId(workspaceId);
        Map<String, String> resourceFilters = parseScopedFilter(resourceFilter);
        Map<String, String> attributeFilters = parseScopedFilter(attributeFilter);
        Optional<LogServiceContext> context = resolveWorkspaceEntityContext(
                scope, entityId, serviceName, serviceNamespace, environment);
        if (context.isEmpty()) {
            return Map.of();
        }
        return traceCoverageStatsWithFilters(scope, start, end, traceId, spanId, severityNumber,
                severityText, search, context.get().serviceName(), context.get().serviceNamespace(),
                context.get().environment(), withTrustedEntityScope(entityId, context.get(), resourceFilters),
                attributeFilters, hideInternal, hideNoise, severityCategory);
    }

    private Map<String, Object> traceCoverageStatsWithFilters(String workspaceId, Long start, Long end,
                                                              String traceId, String spanId,
                                                              Integer severityNumber, String severityText, String search,
                                                              String serviceName, String serviceNamespace, String environment,
                                                              Map<String, String> resourceFilters,
                                                              Map<String, String> attributeFilters,
                                                              boolean hideInternal, boolean hideNoise,
                                                              LogSeverityCategory severityCategory) {
        Map<String, Long> aggregate = null;
        if (!hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            aggregate = readTraceCoverage(workspaceId, start, end, traceId, spanId, severityNumber,
                    severityText, search, serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    hideInternal, hideNoise, severityCategory);
        }
        if (aggregate != null) {
            Map<String, Object> result = new HashMap<>();
            result.put("traceCoverage", aggregate);
            return result;
        }

        List<LogEntry> logs = getFilteredLogs(workspaceId, start, end, traceId, spanId,
                severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise, severityCategory);

        Map<String, Object> result = new HashMap<>();
        result.put("traceCoverage", traceCoverage(logs));
        return result;
    }

    @Override
    public LogTrend trendStats(Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               boolean hideInternal, boolean hideNoise) {
        return trendStats(start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, null, null, hideInternal, hideNoise);
    }

    @Override
    public LogTrend trendStats(Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               boolean hideInternal, boolean hideNoise) {
        String workspaceId = capturedWorkspaceId();
        Map<String, String> resourceFilters = StringUtils.hasText(workspaceId)
                ? parseScopedFilter(resourceFilter) : parseLogAttributeFilter(resourceFilter);
        Map<String, String> attributeFilters = StringUtils.hasText(workspaceId)
                ? parseScopedFilter(attributeFilter) : parseLogAttributeFilter(attributeFilter);
        return trendStatsWithFilters(workspaceId, start, end, traceId, spanId,
                severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise, null);
    }

    @Override
    public LogTrend trendStats(Long entityId, Long start, Long end, String traceId, String spanId,
                               Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               boolean hideInternal, boolean hideNoise) {
        String workspaceId = capturedWorkspaceId();
        if (StringUtils.hasText(workspaceId)) {
            return trendStats(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText,
                    search, serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                    hideInternal, hideNoise);
        }
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter));
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter);
        return trendStatsWithFilters(null, start, end, traceId, spanId, severityNumber, severityText, search,
                context.serviceName(), context.serviceNamespace(), context.environment(), resourceFilters, attributeFilters,
                hideInternal, hideNoise, null);
    }

    @Override
    public LogTrend trendStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                               String spanId, Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               boolean hideInternal, boolean hideNoise) {
        return trendStats(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search, serviceName,
                serviceNamespace, environment, resourceFilter, attributeFilter, hideInternal, hideNoise,
                null);
    }

    @Override
    public LogTrend trendStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                               String spanId, Integer severityNumber, String severityText, String search,
                               String serviceName, String serviceNamespace, String environment,
                               String resourceFilter, String attributeFilter,
                               boolean hideInternal, boolean hideNoise,
                               LogSeverityCategory severityCategory) {
        String scope = requiredWorkspaceId(workspaceId);
        Map<String, String> resourceFilters = parseScopedFilter(resourceFilter);
        Map<String, String> attributeFilters = parseScopedFilter(attributeFilter);
        Optional<LogServiceContext> context = resolveWorkspaceEntityContext(
                scope, entityId, serviceName, serviceNamespace, environment);
        if (context.isEmpty()) {
            TrendWindow window = resolveTrendWindow(start, end);
            return new LogTrend(window.start(), window.end(), window.intervalMs(), List.of());
        }
        return trendStatsWithFilters(scope, start, end, traceId, spanId, severityNumber, severityText, search,
                context.get().serviceName(), context.get().serviceNamespace(), context.get().environment(),
                withTrustedEntityScope(entityId, context.get(), resourceFilters), attributeFilters,
                hideInternal, hideNoise, severityCategory);
    }

    private LogTrend trendStatsWithFilters(String workspaceId, Long start, Long end,
                                           String traceId, String spanId,
                                           Integer severityNumber, String severityText, String search,
                                           String serviceName, String serviceNamespace, String environment,
                                           Map<String, String> resourceFilters,
                                           Map<String, String> attributeFilters,
                                           boolean hideInternal, boolean hideNoise,
                                           LogSeverityCategory severityCategory) {
        TrendWindow window = resolveTrendWindow(start, end);
        List<LogTrendBucket> aggregate = null;
        if (!hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            aggregate = readIntervalStats(workspaceId, window, traceId, spanId, severityNumber,
                    severityText, search, serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    hideInternal, hideNoise, severityCategory);
        }
        if (aggregate != null) {
            return new LogTrend(window.start(), window.end(), window.intervalMs(), aggregate);
        }

        List<LogEntry> logs = getFilteredLogs(workspaceId, window.start(), window.end(), traceId, spanId,
                severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise, severityCategory);

        List<LogTrendBucket> buckets = logs.stream()
                .filter(log -> log.getTimeUnixNano() != null)
                .collect(Collectors.groupingBy(
                        log -> LogTrendIntervalPlanner.bucketStart(
                                Math.floorDiv(log.getTimeUnixNano(), 1_000_000L), window.intervalMs()),
                        java.util.TreeMap::new,
                        Collectors.counting()))
                .entrySet().stream()
                .map(entry -> new LogTrendBucket(entry.getKey(), entry.getValue()))
                .toList();
        return new LogTrend(window.start(), window.end(), window.intervalMs(), buckets);
    }

    @Override
    public Map<String, Object> groupByStats(Long start, Long end, String traceId, String spanId,
                                            Integer severityNumber, String severityText, String search,
                                            String serviceName, String serviceNamespace, String environment,
                                            String resourceFilter, String attributeFilter, String groupBy,
                                            Integer limit, String orderBy, Integer minCount,
                                            boolean hideInternal, boolean hideNoise) {
        String normalizedGroupBy = normalizeGroupBy(groupBy);
        int resolvedLimit = resolveGroupByLimit(limit);
        long resolvedMinCount = resolveGroupByMinCount(minCount);
        if (!StringUtils.hasText(normalizedGroupBy)) {
            return groupByResult("", Map.of(), resolvedLimit, orderBy, resolvedMinCount);
        }
        String workspaceId = capturedWorkspaceId();
        Map<String, String> resourceFilters = StringUtils.hasText(workspaceId)
                ? parseScopedFilter(resourceFilter) : parseLogAttributeFilter(resourceFilter);
        Map<String, String> attributeFilters = StringUtils.hasText(workspaceId)
                ? parseScopedFilter(attributeFilter) : parseLogAttributeFilter(attributeFilter);
        return groupByStats(workspaceId, start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, normalizedGroupBy,
                resolvedLimit, orderBy, resolvedMinCount, hideInternal, hideNoise, null);
    }

    @Override
    public Map<String, Object> groupByStats(Long entityId, Long start, Long end, String traceId, String spanId,
                                            Integer severityNumber, String severityText, String search,
                                            String serviceName, String serviceNamespace, String environment,
                                            String resourceFilter, String attributeFilter, String groupBy,
                                            Integer limit, String orderBy, Integer minCount,
                                            boolean hideInternal, boolean hideNoise) {
        String normalizedGroupBy = normalizeGroupBy(groupBy);
        int resolvedLimit = resolveGroupByLimit(limit);
        long resolvedMinCount = resolveGroupByMinCount(minCount);
        if (!StringUtils.hasText(normalizedGroupBy)) {
            return groupByResult("", Map.of(), resolvedLimit, orderBy, resolvedMinCount);
        }
        String workspaceId = capturedWorkspaceId();
        if (StringUtils.hasText(workspaceId)) {
            return groupByStats(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText,
                    search, serviceName, serviceNamespace, environment, resourceFilter, attributeFilter,
                    groupBy, limit, orderBy, minCount, hideInternal, hideNoise);
        }
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter));
        Map<String, String> attributeFilters = parseLogAttributeFilter(attributeFilter);
        return groupByStats(null, start, end, traceId, spanId, severityNumber, severityText, search,
                context.serviceName(), context.serviceNamespace(), context.environment(), resourceFilters, attributeFilters,
                normalizedGroupBy, resolvedLimit, orderBy, resolvedMinCount, hideInternal, hideNoise, null);
    }

    @Override
    public Map<String, Object> groupByStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                            String spanId, Integer severityNumber, String severityText, String search,
                                            String serviceName, String serviceNamespace, String environment,
                                            String resourceFilter, String attributeFilter, String groupBy,
                                            Integer limit, String orderBy, Integer minCount,
                                            boolean hideInternal, boolean hideNoise) {
        return groupByStats(workspaceId, entityId, start, end, traceId, spanId, severityNumber, severityText, search, serviceName,
                serviceNamespace, environment, resourceFilter, attributeFilter, groupBy, limit, orderBy,
                minCount, hideInternal, hideNoise, null);
    }

    @Override
    public Map<String, Object> groupByStats(String workspaceId, Long entityId, Long start, Long end, String traceId,
                                            String spanId, Integer severityNumber, String severityText, String search,
                                            String serviceName, String serviceNamespace, String environment,
                                            String resourceFilter, String attributeFilter, String groupBy,
                                            Integer limit, String orderBy, Integer minCount,
                                            boolean hideInternal, boolean hideNoise,
                                            LogSeverityCategory severityCategory) {
        String scope = requiredWorkspaceId(workspaceId);
        Map<String, String> resourceFilters = parseScopedFilter(resourceFilter);
        Map<String, String> attributeFilters = parseScopedFilter(attributeFilter);
        String normalizedGroupBy = normalizeGroupBy(groupBy);
        int resolvedLimit = resolveGroupByLimit(limit);
        long resolvedMinCount = resolveGroupByMinCount(minCount);
        if (!StringUtils.hasText(normalizedGroupBy)) {
            return groupByResult("", Map.of(), resolvedLimit, orderBy, resolvedMinCount);
        }
        Optional<LogServiceContext> context = resolveWorkspaceEntityContext(
                scope, entityId, serviceName, serviceNamespace, environment);
        if (context.isEmpty()) {
            return Map.of();
        }
        return groupByStats(scope, start, end, traceId, spanId, severityNumber, severityText, search,
                context.get().serviceName(), context.get().serviceNamespace(), context.get().environment(),
                withTrustedEntityScope(entityId, context.get(), resourceFilters), attributeFilters,
                normalizedGroupBy, resolvedLimit, orderBy, resolvedMinCount, hideInternal, hideNoise, severityCategory);
    }

    private Map<String, Object> groupByStats(String workspaceId, Long start, Long end,
                                             String traceId, String spanId,
                                            Integer severityNumber, String severityText, String search,
                                            String serviceName, String serviceNamespace, String environment,
                                            Map<String, String> resourceFilters, Map<String, String> attributeFilters,
                                            String normalizedGroupBy, int resolvedLimit, String orderBy,
                                            long resolvedMinCount, boolean hideInternal, boolean hideNoise,
                                            LogSeverityCategory severityCategory) {
        Map<String, Long> aggregate = null;
        if (!hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            aggregate = readGroupStats(workspaceId, start, end, traceId, spanId, severityNumber,
                    severityText, search, serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    normalizedGroupBy, hideInternal, hideNoise, severityCategory);
        }
        if (aggregate != null) {
            return groupByResult(normalizedGroupBy, aggregate, resolvedLimit, orderBy, resolvedMinCount);
        }

        List<LogEntry> logs = getFilteredLogs(workspaceId, start, end, traceId, spanId,
                severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise, severityCategory);
        Map<String, Long> grouped = logs.stream()
                .collect(Collectors.groupingBy(log -> resolveLogGroupValue(log, normalizedGroupBy), Collectors.counting()));
        return groupByResult(normalizedGroupBy, grouped, resolvedLimit, orderBy, resolvedMinCount);
    }

    @Override
    public Map<String, Object> context(Long logTimeUnixNano, Long start, Long end,
                                       String serviceName, String serviceNamespace, String environment,
                                       String resourceFilter, String attributeFilter,
                                       Integer limit, boolean hideInternal, boolean hideNoise) {
        return context(logTimeUnixNano, start, end, serviceName, serviceNamespace, environment,
                resourceFilter, attributeFilter, limit, null, null, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> context(Long logTimeUnixNano, Long start, Long end,
                                       String serviceName, String serviceNamespace, String environment,
                                       String resourceFilter, String attributeFilter,
                                       Integer limit, String direction, Long cursorLogTimeUnixNano,
                                       boolean hideInternal, boolean hideNoise) {
        String workspaceId = capturedWorkspaceId();
        return contextWithFilters(workspaceId, logTimeUnixNano, start, end,
                serviceName, serviceNamespace, environment,
                StringUtils.hasText(workspaceId) ? parseScopedFilter(resourceFilter)
                        : parseLogAttributeFilter(resourceFilter),
                StringUtils.hasText(workspaceId) ? parseScopedFilter(attributeFilter)
                        : parseLogAttributeFilter(attributeFilter), limit, direction,
                cursorLogTimeUnixNano, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> context(Long entityId, Long logTimeUnixNano, Long start, Long end,
                                       String serviceName, String serviceNamespace, String environment,
                                       String resourceFilter, String attributeFilter,
                                       Integer limit, String direction, Long cursorLogTimeUnixNano,
                                       boolean hideInternal, boolean hideNoise) {
        String workspaceId = capturedWorkspaceId();
        if (StringUtils.hasText(workspaceId)) {
            return context(workspaceId, entityId, logTimeUnixNano, start, end, serviceName, serviceNamespace,
                    environment, resourceFilter, attributeFilter, limit, direction, cursorLogTimeUnixNano,
                    hideInternal, hideNoise);
        }
        LogServiceContext context = resolveEntityFirstLogServiceContext(entityId, serviceName, serviceNamespace, environment);
        Map<String, String> resourceFilters = removeEntityScopeResourceFilters(
                context, parseLogAttributeFilter(resourceFilter));
        return contextWithFilters(null, logTimeUnixNano, start, end,
                context.serviceName(), context.serviceNamespace(),
                context.environment(), resourceFilters, parseLogAttributeFilter(attributeFilter), limit, direction,
                cursorLogTimeUnixNano, hideInternal, hideNoise);
    }

    @Override
    public Map<String, Object> context(String workspaceId, Long entityId, Long logTimeUnixNano, Long start, Long end,
                                       String serviceName, String serviceNamespace, String environment,
                                       String resourceFilter, String attributeFilter,
                                       Integer limit, String direction, Long cursorLogTimeUnixNano,
                                       boolean hideInternal, boolean hideNoise) {
        String scope = requiredWorkspaceId(workspaceId);
        Map<String, String> resourceFilters = parseScopedFilter(resourceFilter);
        Map<String, String> attributeFilters = parseScopedFilter(attributeFilter);
        Optional<LogServiceContext> context = resolveWorkspaceEntityContext(
                scope, entityId, serviceName, serviceNamespace, environment);
        if (context.isEmpty()) {
            return Map.of();
        }
        return contextWithFilters(scope, logTimeUnixNano, start, end,
                context.get().serviceName(), context.get().serviceNamespace(), context.get().environment(),
                withTrustedEntityScope(entityId, context.get(), resourceFilters), attributeFilters,
                limit, direction, cursorLogTimeUnixNano, hideInternal, hideNoise);
    }

    private Map<String, Object> contextWithFilters(String workspaceId, Long logTimeUnixNano, Long start, Long end,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   Map<String, String> resourceFilters,
                                                   Map<String, String> attributeFilters,
                                                   Integer limit, String direction, Long cursorLogTimeUnixNano,
                                                   boolean hideInternal, boolean hideNoise) {
        long targetTimeUnixNano = logTimeUnixNano == null ? 0L : logTimeUnixNano;
        String normalizedDirection = normalizeContextDirection(direction);
        boolean beforePage = "before".equals(normalizedDirection);
        boolean afterPage = "after".equals(normalizedDirection);
        long cursorTimeUnixNano = cursorLogTimeUnixNano == null ? targetTimeUnixNano : cursorLogTimeUnixNano;
        long targetTimeMillis = targetTimeUnixNano / 1_000_000L;
        long resolvedStart = start == null ? targetTimeMillis - DEFAULT_CONTEXT_WINDOW_MS : start;
        long resolvedEnd = end == null ? targetTimeMillis + DEFAULT_CONTEXT_WINDOW_MS : end;
        if (resolvedStart > resolvedEnd) {
            long previousStart = resolvedStart;
            resolvedStart = resolvedEnd;
            resolvedEnd = previousStart;
        }
        int resolvedLimit = resolveContextLimit(limit);
        List<LogEntry> contextLogs = getFilteredLogs(workspaceId, resolvedStart, resolvedEnd,
                null, null, null, null, null,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                hideInternal, hideNoise, null);

        List<LogEntry> beforeCandidates = contextLogs.stream()
                .filter(log -> hasComparableLogTime(log) && log.getTimeUnixNano() < (beforePage ? cursorTimeUnixNano : targetTimeUnixNano))
                .sorted(Comparator.comparing(LogEntry::getTimeUnixNano).reversed())
                .toList();
        List<LogEntry> afterCandidates = contextLogs.stream()
                .filter(log -> hasComparableLogTime(log) && log.getTimeUnixNano() > (afterPage ? cursorTimeUnixNano : targetTimeUnixNano))
                .sorted(Comparator.comparing(LogEntry::getTimeUnixNano))
                .toList();
        LogEntry selected = beforePage || afterPage ? null : contextLogs.stream()
                .filter(log -> hasComparableLogTime(log) && log.getTimeUnixNano() == targetTimeUnixNano)
                .findFirst()
                .orElse(null);
        List<LogEntry> before = afterPage ? List.of() : beforeCandidates.stream()
                .limit(resolvedLimit)
                .sorted(Comparator.comparing(LogEntry::getTimeUnixNano))
                .toList();
        List<LogEntry> after = beforePage ? List.of() : afterCandidates.stream()
                .limit(resolvedLimit)
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("targetTimeUnixNano", targetTimeUnixNano);
        result.put("windowStart", resolvedStart);
        result.put("windowEnd", resolvedEnd);
        result.put("limit", resolvedLimit);
        if (StringUtils.hasText(normalizedDirection)) {
            result.put("direction", normalizedDirection);
            result.put("cursorLogTimeUnixNano", cursorTimeUnixNano);
        }
        result.put("before", before);
        if (!beforePage && !afterPage) {
            result.put("selected", selected);
        }
        result.put("after", after);
        result.put("hasMoreBefore", !afterPage && beforeCandidates.size() > resolvedLimit);
        result.put("hasMoreAfter", !beforePage && afterCandidates.size() > resolvedLimit);
        return result;
    }

    private String normalizeContextDirection(String direction) {
        if (!StringUtils.hasText(direction)) {
            return "";
        }
        String normalized = direction.trim().toLowerCase();
        return "before".equals(normalized) || "after".equals(normalized) ? normalized : "";
    }

    private Map<String, Object> groupByResult(String groupBy, Map<String, Long> aggregate, int limit, String orderBy, long minCount) {
        List<Map<String, Object>> groups = aggregate.entrySet().stream()
                .filter(entry -> StringUtils.hasText(entry.getKey()))
                .filter(entry -> entry.getValue() >= minCount)
                .sorted(resolveLogGroupComparator(orderBy))
                .limit(limit)
                .map(entry -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("value", entry.getKey());
                    row.put("count", entry.getValue());
                    return row;
                })
                .toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("groupBy", groupBy);
        result.put("groups", groups);
        return result;
    }

    private Comparator<Map.Entry<String, Long>> resolveLogGroupComparator(String orderBy) {
        if ("count-asc".equalsIgnoreCase(StringUtils.trimWhitespace(orderBy))) {
            return Comparator.comparingLong(Map.Entry::getValue);
        }
        return (left, right) -> Long.compare(right.getValue(), left.getValue());
    }

    private int resolveGroupByLimit(Integer limit) {
        if (limit == null || limit < 1) {
            return DEFAULT_GROUP_BY_LIMIT;
        }
        return Math.min(limit, MAX_GROUP_BY_LIMIT);
    }

    private long resolveGroupByMinCount(Integer minCount) {
        if (minCount == null || minCount < 1) {
            return 1L;
        }
        return Math.min(minCount.longValue(), MAX_GROUP_BY_MIN_COUNT);
    }

    private int resolveContextLimit(Integer limit) {
        if (limit == null || limit < 1) {
            return DEFAULT_CONTEXT_LIMIT;
        }
        return Math.min(limit, MAX_CONTEXT_LIMIT);
    }

    private boolean hasComparableLogTime(LogEntry logEntry) {
        return logEntry != null && logEntry.getTimeUnixNano() != null;
    }

    private Map<String, Long> readGroupStats(String workspaceId, Long start, Long end,
                                             String traceId, String spanId,
                                             Integer severityNumber, String severityText, String search,
                                             String serviceName, String serviceNamespace, String environment,
                                             Map<String, String> resourceFilters,
                                             Map<String, String> attributeFilters,
                                             String groupBy, boolean hideInternal, boolean hideNoise,
                                             LogSeverityCategory severityCategory) {
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                Map<String, Long> aggregate = severityCategory == null ? historyDataReader.countLogsByGroup(
                        start, end, traceId, spanId, severityNumber, severityText, search,
                        hiddenServiceNames(hideInternal, hideNoise),
                        shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                        serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, groupBy)
                        : historyDataReader.countLogsByGroup(
                        start, end, traceId, spanId, severityNumber, severityText, search,
                        hiddenServiceNames(hideInternal, hideNoise),
                        shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                        serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, groupBy, severityCategory);
                return aggregate == null ? Map.of() : aggregate;
            } catch (UnsupportedOperationException ex) {
                // Fall back to row-based grouping for history stores without native group-by support.
            }
        }
        return null;
    }

    private Map<String, Long> readSeverityBuckets(String workspaceId, Long start, Long end,
                                                  String traceId, String spanId,
                                                  Integer severityNumber, String severityText, String search,
                                                  String serviceName, String serviceNamespace, String environment,
                                                  Map<String, String> resourceFilters,
                                                  Map<String, String> attributeFilters,
                                                  boolean hideInternal, boolean hideNoise,
                                                  LogSeverityCategory severityCategory) {
        boolean hasAttributeFilters = severityCategory != null || hasAttributeFilters(resourceFilters, attributeFilters);
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                Map<String, Long> aggregate;
                if (hasAttributeFilters) {
                    aggregate = severityCategory == null ? historyDataReader.countLogsBySeverityBuckets(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters)
                        : historyDataReader.countLogsBySeverityBuckets(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, severityCategory);
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    aggregate = historyDataReader.countLogsBySeverityBuckets(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                            serviceName, serviceNamespace, environment);
                } else if (StringUtils.hasText(workspaceId)) {
                    aggregate = historyDataReader.countLogsBySeverityBuckets(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId);
                } else {
                    aggregate = historyDataReader.countLogsBySeverityBuckets(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise));
                }
                return aggregate == null ? Map.of() : aggregate;
            } catch (UnsupportedOperationException ex) {
                // Fall back to row-based aggregation for history stores without native aggregate support.
            }
        }
        return null;
    }

    private Map<String, Long> readTraceCoverage(String workspaceId, Long start, Long end,
                                                String traceId, String spanId,
                                                Integer severityNumber, String severityText, String search,
                                                String serviceName, String serviceNamespace, String environment,
                                                Map<String, String> resourceFilters,
                                                Map<String, String> attributeFilters,
                                                boolean hideInternal, boolean hideNoise,
                                                LogSeverityCategory severityCategory) {
        boolean hasAttributeFilters = severityCategory != null || hasAttributeFilters(resourceFilters, attributeFilters);
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                Map<String, Long> aggregate;
                if (hasAttributeFilters) {
                    aggregate = severityCategory == null ? historyDataReader.countLogTraceCoverage(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters)
                        : historyDataReader.countLogTraceCoverage(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, severityCategory);
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    aggregate = historyDataReader.countLogTraceCoverage(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                            serviceName, serviceNamespace, environment);
                } else if (StringUtils.hasText(workspaceId)) {
                    aggregate = historyDataReader.countLogTraceCoverage(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId);
                } else {
                    aggregate = historyDataReader.countLogTraceCoverage(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise));
                }
                return aggregate == null ? Map.of() : aggregate;
            } catch (UnsupportedOperationException ex) {
                // Fall back to row-based aggregation for history stores without native aggregate support.
            }
        }
        return null;
    }

    private List<LogTrendBucket> readIntervalStats(String workspaceId, TrendWindow window,
                                                   String traceId, String spanId,
                                                   Integer severityNumber, String severityText, String search,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   Map<String, String> resourceFilters,
                                                   Map<String, String> attributeFilters,
                                                   boolean hideInternal, boolean hideNoise,
                                                   LogSeverityCategory severityCategory) {
        boolean hasAttributeFilters = severityCategory != null || hasAttributeFilters(resourceFilters, attributeFilters);
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                List<LogTrendBucket> aggregate;
                if (hasAttributeFilters) {
                    aggregate = severityCategory == null ? historyDataReader.countLogsByInterval(
                            window.start(), window.end(), window.intervalMs(), traceId, spanId,
                            severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters)
                        : historyDataReader.countLogsByInterval(
                            window.start(), window.end(), window.intervalMs(), traceId, spanId,
                            severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, severityCategory);
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    aggregate = historyDataReader.countLogsByInterval(
                            window.start(), window.end(), window.intervalMs(), traceId, spanId,
                            severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId,
                            serviceName, serviceNamespace, environment);
                } else if (StringUtils.hasText(workspaceId)) {
                    aggregate = historyDataReader.countLogsByInterval(
                            window.start(), window.end(), window.intervalMs(), traceId, spanId,
                            severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise), workspaceId);
                } else {
                    aggregate = historyDataReader.countLogsByInterval(
                            window.start(), window.end(), window.intervalMs(), traceId, spanId,
                            severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise),
                            shouldRequireServiceName(hideInternal, hideNoise));
                }
                return aggregate == null ? List.of() : aggregate;
            } catch (UnsupportedOperationException ex) {
                // Fall back to row-based aggregation for history stores without native aggregate support.
            }
        }
        return null;
    }

    private static TrendWindow resolveTrendWindow(Long start, Long end) {
        long resolvedEnd = end == null ? System.currentTimeMillis() : end;
        long resolvedStart = start == null ? resolvedEnd - LogTrendIntervalPlanner.DEFAULT_WINDOW_MS : start;
        return new TrendWindow(resolvedStart, resolvedEnd,
                LogTrendIntervalPlanner.select(resolvedStart, resolvedEnd));
    }

    private record TrendWindow(long start, long end, long intervalMs) {
    }

    private List<LogEntry> getFilteredLogs(String workspaceId, Long start, Long end,
                                           String traceId, String spanId,
                                           Integer severityNumber, String severityText, String search,
                                           String serviceName, String serviceNamespace, String environment,
                                           Map<String, String> resourceFilters,
                                           Map<String, String> attributeFilters,
                                           boolean hideInternal, boolean hideNoise,
                                           LogSeverityCategory severityCategory) {
        if (StringUtils.hasText(workspaceId)) {
            return getWorkspaceFilteredLogs(workspaceId, start, end, traceId, spanId, severityNumber,
                    severityText, search, serviceName, serviceNamespace, environment,
                    resourceFilters, attributeFilters, hideInternal, hideNoise, severityCategory);
        }
        boolean hasAttributeFilters = hasAttributeFilters(resourceFilters, attributeFilters);
        if (hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            return getRowFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    hideInternal, hideNoise);
        }
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                List<LogEntry> logs;
                if (hasAttributeFilters) {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise),
                            null, serviceName, serviceNamespace, environment, resourceFilters, attributeFilters);
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise),
                            null, serviceName, serviceNamespace, environment);
                } else if (hideInternal || hideNoise) {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise));
                } else {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search);
                }
                if (logs != null && !logs.isEmpty()) {
                    return filterQueryLogs(null, logs, serviceName, serviceNamespace, environment,
                            resourceFilters, attributeFilters, hideInternal, hideNoise);
                }
            } catch (UnsupportedOperationException ex) {
                // Try the next reader. Not every history store supports log queries.
            }
        }
        if (hasExtendedFilterContext(serviceName, serviceNamespace, environment, resourceFilters, attributeFilters)) {
            return getRowFilteredLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    hideInternal, hideNoise);
        }
        return Collections.emptyList();
    }

    private List<LogEntry> getWorkspaceFilteredLogs(String workspaceId, Long start, Long end,
                                                     String traceId, String spanId,
                                                     Integer severityNumber, String severityText, String search,
                                                     String serviceName, String serviceNamespace, String environment,
                                                     Map<String, String> resourceFilters,
                                                     Map<String, String> attributeFilters,
                                                     boolean hideInternal, boolean hideNoise,
                                                     LogSeverityCategory severityCategory) {
        boolean complex = hasComplexAttributeFilters(resourceFilters, attributeFilters);
        Map<String, String> storageResourceFilters = complex ? Map.of() : resourceFilters;
        Map<String, String> storageAttributeFilters = complex ? Map.of() : attributeFilters;
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                List<LogEntry> logs = severityCategory == null ? historyDataReader.queryLogsByMultipleConditions(
                        start, end, traceId, spanId, severityNumber, severityText, search,
                        hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise),
                        workspaceId, serviceName, serviceNamespace, environment,
                        storageResourceFilters, storageAttributeFilters)
                        : historyDataReader.queryLogsByMultipleConditions(
                        start, end, traceId, spanId, severityNumber, severityText, search,
                        hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise),
                        workspaceId, serviceName, serviceNamespace, environment,
                        storageResourceFilters, storageAttributeFilters, severityCategory);
                return filterQueryLogs(workspaceId, logs, serviceName, serviceNamespace, environment,
                        resourceFilters, attributeFilters, hideInternal, hideNoise);
            } catch (UnsupportedOperationException ex) {
                try {
                    List<LogEntry> logs = queryWorkspaceBaseLogs(historyDataReader, workspaceId,
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            serviceName, serviceNamespace, environment, hideInternal, hideNoise, severityCategory);
                    return filterQueryLogs(workspaceId, logs, serviceName, serviceNamespace, environment,
                            resourceFilters, attributeFilters, hideInternal, hideNoise);
                } catch (UnsupportedOperationException ignored) {
                    // Try the next reader with the same trusted workspace.
                }
            }
        }
        throw new TelemetryStorageUnavailableException();
    }

    private List<LogEntry> queryWorkspaceBaseLogs(HistoryDataReader historyDataReader, String workspaceId,
                                                   Long start, Long end, String traceId, String spanId,
                                                   Integer severityNumber, String severityText, String search,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   boolean hideInternal, boolean hideNoise,
                                                   LogSeverityCategory severityCategory) {
        List<LogEntry> logs = historyDataReader.queryLogsByMultipleConditions(
                start, end, traceId, spanId, severityNumber, severityText, search,
                hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise),
                workspaceId, serviceName, serviceNamespace, environment);
        return severityCategory == null || logs == null ? logs
                : logs.stream().filter(log -> severityCategory.matches(log.getSeverityNumber())).toList();
    }

    private List<LogEntry> getRowFilteredLogs(Long start, Long end, String traceId, String spanId,
                                              Integer severityNumber, String severityText, String search,
                                              String serviceName, String serviceNamespace, String environment,
                                              Map<String, String> resourceFilters,
                                              Map<String, String> attributeFilters,
                                              boolean hideInternal, boolean hideNoise) {
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                List<LogEntry> logs;
                if (hideInternal || hideNoise) {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise));
                } else {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search);
                }
                if (logs != null && !logs.isEmpty()) {
                    return filterQueryLogs(null, logs, serviceName, serviceNamespace, environment,
                            resourceFilters, attributeFilters, hideInternal, hideNoise);
                }
            } catch (UnsupportedOperationException ex) {
                // Try the next reader. Not every history store supports log queries.
            }
        }
        return Collections.emptyList();
    }

    private Page<LogEntry> getPagedLogs(String workspaceId, Long start, Long end,
                                        String traceId, String spanId,
                                        Integer severityNumber, String severityText, String search,
                                        String serviceName, String serviceNamespace, String environment,
                                        Map<String, String> resourceFilters,
                                        Map<String, String> attributeFilters,
                                        Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise,
                                        LogSeverityCategory severityCategory) {
        return getPagedLogs(workspaceId, start, end, traceId, spanId, severityNumber, severityText, search,
                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                pageIndex, pageSize, hideInternal, hideNoise, severityCategory, "newest");
    }

    private Page<LogEntry> getPagedLogs(String workspaceId, Long start, Long end,
                                        String traceId, String spanId,
                                        Integer severityNumber, String severityText, String search,
                                        String serviceName, String serviceNamespace, String environment,
                                        Map<String, String> resourceFilters,
                                        Map<String, String> attributeFilters,
                                        Integer pageIndex, Integer pageSize, boolean hideInternal, boolean hideNoise,
                                        LogSeverityCategory severityCategory, String order) {
        int resolvedPageIndex = normalizeListPageIndex(pageIndex);
        int resolvedPageSize = normalizeListPageSize(pageSize);
        int offset = Math.toIntExact(Math.min((long) resolvedPageIndex * resolvedPageSize, Integer.MAX_VALUE));
        Sort sort = Sort.by("oldest".equals(order) ? Sort.Direction.ASC : Sort.Direction.DESC, "timeUnixNano", "logRecordUid");
        PageRequest pageRequest = PageRequest.of(resolvedPageIndex, resolvedPageSize, sort);

        if (StringUtils.hasText(workspaceId) && hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            List<LogEntry> logs = getWorkspaceFilteredLogs(workspaceId, start, end, traceId, spanId,
                    severityNumber, severityText, search, serviceName, serviceNamespace, environment,
                    resourceFilters, attributeFilters, hideInternal, hideNoise, severityCategory);
            logs = orderedLogs(logs, "oldest".equals(order));
            int fromIndex = Math.min(offset, logs.size());
            int toIndex = Math.min(fromIndex + resolvedPageSize, logs.size());
            return new PageImpl<>(List.copyOf(logs.subList(fromIndex, toIndex)), pageRequest, logs.size());
        }
        if (hasComplexAttributeFilters(resourceFilters, attributeFilters)) {
            return getRowFilteredPagedLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    pageRequest, offset, resolvedPageSize, hideInternal, hideNoise);
        }

        if (StringUtils.hasText(workspaceId)) {
            return getWorkspacePagedLogs(workspaceId, start, end, traceId, spanId,
                    severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    pageRequest, offset, resolvedPageSize, hideInternal, hideNoise, severityCategory);
        }

        boolean hasAttributeFilters = hasAttributeFilters(resourceFilters, attributeFilters);
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                if (hasAttributeFilters) {
                    Set<String> hiddenServiceNames = hiddenServiceNames(hideInternal, hideNoise);
                    boolean requireServiceName = shouldRequireServiceName(hideInternal, hideNoise);
                    long totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName, null, serviceName, serviceNamespace, environment,
                            resourceFilters, attributeFilters);
                    if (totalElements <= 0) {
                        continue;
                    }
                    List<LogEntry> pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, resolvedPageSize,
                            hiddenServiceNames, requireServiceName, null, serviceName, serviceNamespace, environment,
                            resourceFilters, attributeFilters);
                    return storageFilteredPage(
                            null, pagedLogs, pageRequest, totalElements, offset,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                            hideInternal, hideNoise);
                } else if (hasServiceContext(serviceName, serviceNamespace, environment)) {
                    Set<String> hiddenServiceNames = hiddenServiceNames(hideInternal, hideNoise);
                    boolean requireServiceName = shouldRequireServiceName(hideInternal, hideNoise);
                    long totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName, null, serviceName, serviceNamespace, environment);
                    if (totalElements <= 0) {
                        continue;
                    }
                    List<LogEntry> pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, resolvedPageSize,
                            hiddenServiceNames, requireServiceName, null, serviceName, serviceNamespace, environment);
                    List<LogEntry> filteredLogs = filterQueryLogs(null, pagedLogs,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                            hideInternal, hideNoise);
                    long safeTotal = filteredLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                            ? offset + filteredLogs.size()
                            : totalElements;
                    return new PageImpl<>(filteredLogs, pageRequest, safeTotal);
                } else if (hideInternal || hideNoise) {
                    Set<String> hiddenServiceNames = hiddenServiceNames(hideInternal, hideNoise);
                    boolean requireServiceName = shouldRequireServiceName(hideInternal, hideNoise);
                    long totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName);
                    if (totalElements <= 0) {
                        continue;
                    }
                    List<LogEntry> pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, resolvedPageSize,
                            hiddenServiceNames, requireServiceName);
                    List<LogEntry> filteredLogs = filterQueryLogs(null, pagedLogs,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                            hideInternal, hideNoise);
                    long safeTotal = filteredLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                            ? offset + filteredLogs.size()
                            : totalElements;
                    return new PageImpl<>(filteredLogs, pageRequest, safeTotal);
                }
                long totalElements = historyDataReader.countLogsByMultipleConditions(
                        start, end, traceId, spanId, severityNumber, severityText, search);
                if (totalElements <= 0) {
                    continue;
                }
                List<LogEntry> pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                        start, end, traceId, spanId, severityNumber, severityText, search, offset, resolvedPageSize);
                List<LogEntry> filteredLogs = filterQueryLogs(null, pagedLogs,
                        serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                        hideInternal, hideNoise);
                long safeTotal = filteredLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                        ? offset + filteredLogs.size()
                        : totalElements;
                return new PageImpl<>(filteredLogs, pageRequest, safeTotal);
            } catch (UnsupportedOperationException ex) {
                // Try the next reader. Not every history store supports log queries.
            }
        }
        if (hasExtendedFilterContext(serviceName, serviceNamespace, environment, resourceFilters, attributeFilters)) {
            return getRowFilteredPagedLogs(start, end, traceId, spanId, severityNumber, severityText, search,
                    serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                    pageRequest, offset, resolvedPageSize, hideInternal, hideNoise);
        }
        return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
    }

    private int normalizeListPageIndex(Integer pageIndex) {
        if (pageIndex == null || pageIndex < DEFAULT_LIST_PAGE_INDEX) {
            return DEFAULT_LIST_PAGE_INDEX;
        }
        return pageIndex;
    }

    private int normalizeListPageSize(Integer pageSize) {
        if (pageSize == null || pageSize <= 0) {
            return DEFAULT_LIST_PAGE_SIZE;
        }
        return Math.min(pageSize, MAX_LIST_PAGE_SIZE);
    }

    private Page<LogEntry> getWorkspacePagedLogs(String workspaceId, Long start, Long end,
                                                 String traceId, String spanId,
                                                 Integer severityNumber, String severityText, String search,
                                                 String serviceName, String serviceNamespace, String environment,
                                                 Map<String, String> resourceFilters,
                                                 Map<String, String> attributeFilters,
                                                 PageRequest pageRequest, int offset, int pageSize,
                                                 boolean hideInternal, boolean hideNoise,
                                                 LogSeverityCategory severityCategory) {
        Set<String> hiddenServiceNames = hiddenServiceNames(hideInternal, hideNoise);
        boolean requireServiceName = shouldRequireServiceName(hideInternal, hideNoise);
        boolean hasAttributeFilters = severityCategory != null || hasAttributeFilters(resourceFilters, attributeFilters);
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                long totalElements;
                if (hasAttributeFilters) {
                    if (severityCategory != null || hasServiceContext(serviceName, serviceNamespace, environment)) {
                        totalElements = severityCategory == null ? historyDataReader.countLogsByMultipleConditions(
                                start, end, traceId, spanId, severityNumber, severityText, search,
                                hiddenServiceNames, requireServiceName, workspaceId,
                                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters)
                            : historyDataReader.countLogsByMultipleConditions(
                                start, end, traceId, spanId, severityNumber, severityText, search,
                                hiddenServiceNames, requireServiceName, workspaceId,
                                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, severityCategory);
                    } else {
                        totalElements = historyDataReader.countLogsByMultipleConditions(
                                start, end, traceId, spanId, severityNumber, severityText, search,
                                hiddenServiceNames, requireServiceName, workspaceId,
                                resourceFilters, attributeFilters);
                    }
                } else if (severityCategory != null || hasServiceContext(serviceName, serviceNamespace, environment)) {
                    totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName, workspaceId,
                            serviceName, serviceNamespace, environment);
                } else {
                    totalElements = historyDataReader.countLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames, requireServiceName, workspaceId);
                }
                if (totalElements <= 0) {
                    return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
                }
                List<LogEntry> pagedLogs;
                boolean oldest = pageRequest.getSort().getOrderFor("timeUnixNano").isAscending();
                if (oldest) {
                    pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                            hiddenServiceNames, requireServiceName, workspaceId, serviceName, serviceNamespace,
                            environment, resourceFilters, attributeFilters, severityCategory, "oldest");
                    return storageFilteredPage(workspaceId, pagedLogs, pageRequest, totalElements, offset,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, hideInternal, hideNoise);
                }
                if (hasAttributeFilters) {
                    if (severityCategory != null || hasServiceContext(serviceName, serviceNamespace, environment)) {
                        pagedLogs = severityCategory == null ? historyDataReader.queryLogsByMultipleConditionsWithPagination(
                                start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                                hiddenServiceNames, requireServiceName, workspaceId,
                                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters)
                            : historyDataReader.queryLogsByMultipleConditionsWithPagination(
                                start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                                hiddenServiceNames, requireServiceName, workspaceId,
                                serviceName, serviceNamespace, environment, resourceFilters, attributeFilters, severityCategory);
                    } else {
                        pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                                start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                                hiddenServiceNames, requireServiceName, workspaceId,
                                resourceFilters, attributeFilters);
                    }
                    return storageFilteredPage(
                            workspaceId, pagedLogs, pageRequest, totalElements, offset,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                            hideInternal, hideNoise);
                } else if (severityCategory != null || hasServiceContext(serviceName, serviceNamespace, environment)) {
                    pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                            hiddenServiceNames, requireServiceName, workspaceId,
                            serviceName, serviceNamespace, environment);
                } else {
                    pagedLogs = historyDataReader.queryLogsByMultipleConditionsWithPagination(
                            start, end, traceId, spanId, severityNumber, severityText, search, offset, pageSize,
                            hiddenServiceNames, requireServiceName, workspaceId);
                }
                List<LogEntry> guardedLogs = filterQueryLogs(workspaceId, pagedLogs,
                        serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                        hideInternal, hideNoise);
                long safeTotal = guardedLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                        ? offset + guardedLogs.size()
                        : totalElements;
                return new PageImpl<>(guardedLogs, pageRequest, safeTotal);
            } catch (UnsupportedOperationException ex) {
                try {
                    List<LogEntry> logs = queryWorkspaceBaseLogs(historyDataReader, workspaceId,
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            serviceName, serviceNamespace, environment, hideInternal, hideNoise, severityCategory);
                    List<LogEntry> filteredLogs = filterQueryLogs(workspaceId, logs,
                            serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                            hideInternal, hideNoise);
                    filteredLogs = orderedLogs(filteredLogs, pageRequest.getSort().getOrderFor("timeUnixNano").isAscending());
                    int fromIndex = Math.min(offset, filteredLogs.size());
                    int toIndex = Math.min(fromIndex + pageSize, filteredLogs.size());
                    return new PageImpl<>(List.copyOf(filteredLogs.subList(fromIndex, toIndex)),
                            pageRequest, filteredLogs.size());
                } catch (UnsupportedOperationException ignored) {
                    // Try the next reader with the same trusted workspace.
                }
            }
        }
        throw new TelemetryStorageUnavailableException();
    }

    private static List<LogEntry> orderedLogs(List<LogEntry> logs, boolean oldest) {
        Comparator<LogEntry> comparator = Comparator.comparing(LogEntry::getTimeUnixNano,
                Comparator.nullsLast(Long::compareTo)).thenComparing(log -> {
                    Object uid = log.getAttributes() == null ? null : log.getAttributes().get("log.record.uid");
                    return uid == null ? "" : String.valueOf(uid);
                });
        return logs.stream().sorted(oldest ? comparator : comparator.reversed()).toList();
    }

    private Page<LogEntry> storageFilteredPage(
            String workspaceId,
            List<LogEntry> pagedLogs,
            PageRequest pageRequest,
            long totalElements,
            int offset,
            String serviceName,
            String serviceNamespace,
            String environment,
            Map<String, String> resourceFilters,
            Map<String, String> attributeFilters,
            boolean hideInternal,
            boolean hideNoise) {
        // A storage reader that accepts attribute predicates owns their semantics. In particular,
        // an HTTP route may match a log through its trace ID even when the log record itself does
        // not duplicate the span's http.route attribute.
        Map<String, String> rowAttributeFilters = attributeFilters;
        String endpoint = attributeFilters == null ? null : attributeFilters.get("http.route");
        if (StringUtils.hasText(endpoint) && !endpoint.startsWith(LOG_FILTER_NEGATION_PREFIX)) {
            Map<String, String> remainingFilters = new LinkedHashMap<>(attributeFilters);
            remainingFilters.remove("http.route");
            rowAttributeFilters = remainingFilters;
        }
        List<LogEntry> guardedLogs = filterQueryLogs(
                workspaceId, pagedLogs, serviceName, serviceNamespace, environment,
                resourceFilters, rowAttributeFilters, hideInternal, hideNoise);
        long safeTotal = guardedLogs.size() < (pagedLogs == null ? 0 : pagedLogs.size())
                ? offset + guardedLogs.size()
                : totalElements;
        return new PageImpl<>(guardedLogs, pageRequest, safeTotal);
    }

    private Page<LogEntry> getRowFilteredPagedLogs(Long start, Long end, String traceId, String spanId,
                                                   Integer severityNumber, String severityText, String search,
                                                   String serviceName, String serviceNamespace, String environment,
                                                   Map<String, String> resourceFilters,
                                                   Map<String, String> attributeFilters,
                                                   PageRequest pageRequest, int offset, int pageSize,
                                                   boolean hideInternal, boolean hideNoise) {
        for (HistoryDataReader historyDataReader : historyDataReaders) {
            try {
                List<LogEntry> logs;
                if (hideInternal || hideNoise) {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search,
                            hiddenServiceNames(hideInternal, hideNoise), shouldRequireServiceName(hideInternal, hideNoise));
                } else {
                    logs = historyDataReader.queryLogsByMultipleConditions(
                            start, end, traceId, spanId, severityNumber, severityText, search);
                }
                if (logs == null || logs.isEmpty()) {
                    continue;
                }
                List<LogEntry> filteredLogs = filterQueryLogs(null, logs,
                        serviceName, serviceNamespace, environment, resourceFilters, attributeFilters,
                        hideInternal, hideNoise);
                int fromIndex = Math.min(offset, filteredLogs.size());
                int toIndex = Math.min(fromIndex + pageSize, filteredLogs.size());
                return new PageImpl<>(List.copyOf(filteredLogs.subList(fromIndex, toIndex)),
                        pageRequest, filteredLogs.size());
            } catch (UnsupportedOperationException ex) {
                // Try the next reader. Not every history store supports log queries.
            }
        }
        return new PageImpl<>(Collections.emptyList(), pageRequest, 0);
    }

    private LogServiceContext resolveEntityFirstLogServiceContext(Long entityId, String serviceName,
                                                                  String serviceNamespace, String environment) {
        String resolvedServiceName = trimToNull(serviceName);
        String resolvedServiceNamespace = trimToNull(serviceNamespace);
        String resolvedEnvironment = trimToNull(environment);
        if (entityId == null || workspaceQueryGateway == null) {
            return new LogServiceContext(resolvedServiceName, resolvedServiceNamespace, resolvedEnvironment);
        }
        Optional<ObserveEntity> entity = workspaceQueryGateway.findEntityById(entityId);
        Set<String> resolvedIdentityKeys = new LinkedHashSet<>();
        for (EntityIdentity identity : rankedEntityIdentities(workspaceQueryGateway.findIdentitiesByEntityId(entityId))) {
            if (!StringUtils.hasText(identity.getIdentityKey()) || !StringUtils.hasText(identity.getIdentityValue())) {
                continue;
            }
            if (!resolvedIdentityKeys.add(identity.getIdentityKey())) {
                continue;
            }
            switch (identity.getIdentityKey()) {
                case "service.name" -> resolvedServiceName = trimToNull(identity.getIdentityValue());
                case "service.namespace" -> resolvedServiceNamespace = trimToNull(identity.getIdentityValue());
                case "deployment.environment.name" -> resolvedEnvironment = trimToNull(identity.getIdentityValue());
                default -> {
                }
            }
        }
        if (!StringUtils.hasText(resolvedServiceName) && entity.isPresent()
                && "service".equalsIgnoreCase(trimToNull(entity.get().getType()))) {
            resolvedServiceName = trimToNull(entity.get().getName());
        }
        if (!StringUtils.hasText(resolvedServiceNamespace) && entity.isPresent()) {
            resolvedServiceNamespace = trimToNull(entity.get().getNamespace());
        }
        if (!StringUtils.hasText(resolvedEnvironment) && entity.isPresent()) {
            resolvedEnvironment = trimToNull(entity.get().getEnvironment());
        }
        return new LogServiceContext(resolvedServiceName, resolvedServiceNamespace, resolvedEnvironment);
    }

    private Optional<LogServiceContext> resolveWorkspaceEntityContext(String workspaceId, Long entityId,
                                                                      String serviceName,
                                                                      String serviceNamespace,
                                                                      String environment) {
        String resolvedServiceName = trimToNull(serviceName);
        String resolvedServiceNamespace = trimToNull(serviceNamespace);
        String resolvedEnvironment = trimToNull(environment);
        if (entityId == null) {
            return Optional.of(new LogServiceContext(
                    resolvedServiceName, resolvedServiceNamespace, resolvedEnvironment));
        }
        if (workspaceQueryGateway == null) {
            return Optional.empty();
        }
        Optional<ObserveEntity> entity = workspaceQueryGateway.findEntityById(workspaceId, entityId);
        if (entity.isEmpty()) {
            return Optional.empty();
        }
        Set<String> resolvedIdentityKeys = new LinkedHashSet<>();
        for (EntityIdentity identity : rankedEntityIdentities(
                workspaceQueryGateway.findIdentitiesByEntityId(workspaceId, entityId))) {
            if (!StringUtils.hasText(identity.getIdentityKey()) || !StringUtils.hasText(identity.getIdentityValue())
                    || !resolvedIdentityKeys.add(identity.getIdentityKey())) {
                continue;
            }
            switch (identity.getIdentityKey()) {
                case "service.name" -> resolvedServiceName = trimToNull(identity.getIdentityValue());
                case "service.namespace" -> resolvedServiceNamespace = trimToNull(identity.getIdentityValue());
                case "deployment.environment.name" -> resolvedEnvironment = trimToNull(identity.getIdentityValue());
                default -> {
                }
            }
        }
        if (!StringUtils.hasText(resolvedServiceName)
                && "service".equalsIgnoreCase(trimToNull(entity.get().getType()))) {
            resolvedServiceName = trimToNull(entity.get().getName());
        }
        if (!StringUtils.hasText(resolvedServiceNamespace)) {
            resolvedServiceNamespace = trimToNull(entity.get().getNamespace());
        }
        if (!StringUtils.hasText(resolvedEnvironment)) {
            resolvedEnvironment = trimToNull(entity.get().getEnvironment());
        }
        return Optional.of(new LogServiceContext(
                resolvedServiceName, resolvedServiceNamespace, resolvedEnvironment));
    }

    private String capturedWorkspaceId() {
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        return StringUtils.hasText(workspaceId) ? AuthTokenScopes.normalizeWorkspaceId(workspaceId) : null;
    }

    private String requiredWorkspaceId(String workspaceId) {
        if (!StringUtils.hasText(workspaceId)) {
            throw new TelemetryStorageUnavailableException();
        }
        return AuthTokenScopes.normalizeWorkspaceId(workspaceId);
    }

    private Map<String, String> parseScopedFilter(String filterExpression) {
        Map<String, String> filters = parseLogAttributeFilter(filterExpression);
        if (filters.keySet().stream().anyMatch(OtlpResourceSemanticAttributes.HERTZBEAT_WORKSPACE_ID_KEYS::contains)) {
            throw new IllegalArgumentException("Workspace resource predicates are not accepted");
        }
        return filters;
    }


    private List<EntityIdentity> rankedEntityIdentities(List<EntityIdentity> identities) {
        if (identities == null || identities.isEmpty()) {
            return List.of();
        }
        return identities.stream()
                .sorted(Comparator.comparing(EntityIdentity::isPrimaryIdentity).reversed()
                        .thenComparing(EntityIdentity::getPriority, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(EntityIdentity::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private Set<String> hiddenServiceNames(boolean hideInternal, boolean hideNoise) {
        return new LogVisibilityFilter(hideInternal, hideNoise).hiddenServiceNames();
    }

    private boolean shouldRequireServiceName(boolean hideInternal, boolean hideNoise) {
        return new LogVisibilityFilter(hideInternal, hideNoise).requireServiceName();
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private record LogServiceContext(String serviceName, String serviceNamespace, String environment) {
    }

    private boolean hasServiceContext(String serviceName, String serviceNamespace, String environment) {
        return StringUtils.hasText(serviceName)
                || StringUtils.hasText(serviceNamespace)
                || StringUtils.hasText(environment);
    }

    private boolean hasExtendedFilterContext(String serviceName, String serviceNamespace, String environment,
                                             Map<String, String> resourceFilters,
                                             Map<String, String> attributeFilters) {
        return hasServiceContext(serviceName, serviceNamespace, environment)
                || hasAttributeFilters(resourceFilters, attributeFilters);
    }

    private boolean hasAttributeFilters(Map<String, String> resourceFilters, Map<String, String> attributeFilters) {
        return (resourceFilters != null && !resourceFilters.isEmpty())
                || (attributeFilters != null && !attributeFilters.isEmpty());
    }

    private boolean hasComplexAttributeFilters(Map<String, String> resourceFilters, Map<String, String> attributeFilters) {
        return hasComplexAttributeFilterValues(resourceFilters) || hasComplexAttributeFilterValues(attributeFilters);
    }

    private boolean hasComplexAttributeFilterValues(Map<String, String> filters) {
        return filters != null && filters.values().stream().anyMatch(this::isComplexLogAttributeFilter);
    }

    private Map<String, String> parseLogAttributeFilter(String filterExpression) {
        return LogAttributeFilterParser.parse(filterExpression);
    }

    private Map<String, String> removeEntityScopeResourceFilters(LogServiceContext context,
                                                                 Map<String, String> resourceFilters) {
        if (context == null || resourceFilters == null || resourceFilters.isEmpty()) {
            return resourceFilters;
        }
        Map<String, String> filtered = new LinkedHashMap<>();
        resourceFilters.forEach((key, value) -> {
            if (ENTITY_SCOPE_RESOURCE_KEYS.contains(key) && hasResolvedEntityScopeValue(context, key)) {
                return;
            }
            filtered.put(key, value);
        });
        return filtered.isEmpty() ? Collections.emptyMap() : Map.copyOf(filtered);
    }

    private Map<String, String> withTrustedEntityScope(Long entityId, LogServiceContext context,
                                                        Map<String, String> resourceFilters) {
        Map<String, String> effectiveFilters = new LinkedHashMap<>(
                removeEntityScopeResourceFilters(context, resourceFilters));
        if (entityId != null && entityId > 0) {
            effectiveFilters.put(OtlpResourceSemanticAttributes.HERTZBEAT_ENTITY_ID, String.valueOf(entityId));
        }
        return effectiveFilters.isEmpty() ? Collections.emptyMap() : Map.copyOf(effectiveFilters);
    }

    private boolean hasResolvedEntityScopeValue(LogServiceContext context, String key) {
        return switch (key) {
            case "service.name" -> StringUtils.hasText(context.serviceName());
            case "service.namespace" -> StringUtils.hasText(context.serviceNamespace());
            case "deployment.environment.name" -> StringUtils.hasText(context.environment());
            default -> false;
        };
    }


    private boolean isSafeAttributeKey(String key) {
        return StringUtils.hasText(key) && key.matches("[A-Za-z0-9_.:-]+");
    }

    private String normalizeGroupBy(String groupBy) {
        if (!StringUtils.hasText(groupBy)) {
            return null;
        }
        String normalized = groupBy.trim();
        return isSafeAttributeKey(normalized) ? normalized : null;
    }

    private List<LogEntry> filterQueryLogs(String workspaceId, List<LogEntry> logs,
                                           String serviceName, String serviceNamespace,
                                           String environment, Map<String, String> resourceFilters,
                                           Map<String, String> attributeFilters,
                                           boolean hideInternal, boolean hideNoise) {
        if (logs == null || logs.isEmpty()) {
            return logs == null ? Collections.emptyList() : logs;
        }
        if (!StringUtils.hasText(workspaceId) && !hideInternal && !hideNoise
                && !hasExtendedFilterContext(serviceName, serviceNamespace, environment,
                resourceFilters, attributeFilters)) {
            return logs;
        }
        return logs.stream()
                .filter(log -> !shouldHideWorkspaceLog(log, hideInternal, hideNoise))
                .filter(log -> matchesWorkspace(log, workspaceId))
                .filter(log -> matchesServiceContext(log, serviceName, serviceNamespace, environment))
                .filter(log -> matchesAttributes(log.getResource(), resourceFilters))
                .filter(log -> matchesAttributes(log.getAttributes(), attributeFilters))
                .toList();
    }

    private boolean matchesAttributes(Map<String, Object> source, Map<String, String> expectedAttributes) {
        if (expectedAttributes == null || expectedAttributes.isEmpty()) {
            return true;
        }
        if (source == null || source.isEmpty()) {
            return expectedAttributes.values().stream().allMatch(this::isExclusionLogAttributeFilter);
        }
        return expectedAttributes.entrySet().stream()
                .allMatch(entry -> matchesAttributeFilter(resolveMapValue(source, entry.getKey()), entry.getValue(),
                        source.containsKey(entry.getKey())));
    }

    private boolean matchesAttributeFilter(String actualValue, String expectedValue, boolean keyExists) {
        if (isExistsLogAttributeFilter(expectedValue)) {
            return keyExists;
        }
        if (isNotExistsLogAttributeFilter(expectedValue)) {
            return !keyExists;
        }
        if (isInLogAttributeFilter(expectedValue)) {
            return splitListLogAttributeValues(expectedValue.substring(LOG_FILTER_IN_PREFIX.length())).stream()
                    .anyMatch(expected -> matchesOptionalResourceValue(actualValue, expected));
        }
        if (isNotInLogAttributeFilter(expectedValue)) {
            return splitListLogAttributeValues(expectedValue.substring(LOG_FILTER_NOT_IN_PREFIX.length())).stream()
                    .noneMatch(expected -> matchesOptionalResourceValue(actualValue, expected));
        }
        if (isContainsLogAttributeFilter(expectedValue)) {
            return matchesContainedResourceValue(actualValue,
                    expectedValue.substring(LOG_FILTER_CONTAINS_PREFIX.length()));
        }
        if (isNotContainsLogAttributeFilter(expectedValue)) {
            return !matchesContainedResourceValue(actualValue,
                    expectedValue.substring(LOG_FILTER_NOT_CONTAINS_PREFIX.length()));
        }
        if (isNegatedLogAttributeFilter(expectedValue)) {
            return !matchesOptionalResourceValue(actualValue, expectedValue.substring(LOG_FILTER_NEGATION_PREFIX.length()));
        }
        return matchesOptionalResourceValue(actualValue, expectedValue);
    }

    private boolean isNegatedLogAttributeFilter(String expectedValue) {
        return expectedValue != null && expectedValue.startsWith(LOG_FILTER_NEGATION_PREFIX);
    }

    private boolean isExclusionLogAttributeFilter(String expectedValue) {
        return isNegatedLogAttributeFilter(expectedValue) || isNotInLogAttributeFilter(expectedValue)
                || isNotContainsLogAttributeFilter(expectedValue) || isNotExistsLogAttributeFilter(expectedValue);
    }

    private boolean isComplexLogAttributeFilter(String expectedValue) {
        return isInLogAttributeFilter(expectedValue) || isNotInLogAttributeFilter(expectedValue)
                || isContainsLogAttributeFilter(expectedValue) || isNotContainsLogAttributeFilter(expectedValue)
                || isExistsLogAttributeFilter(expectedValue) || isNotExistsLogAttributeFilter(expectedValue);
    }

    private boolean isInLogAttributeFilter(String expectedValue) {
        return expectedValue != null && expectedValue.startsWith(LOG_FILTER_IN_PREFIX);
    }

    private boolean isNotInLogAttributeFilter(String expectedValue) {
        return expectedValue != null && expectedValue.startsWith(LOG_FILTER_NOT_IN_PREFIX);
    }

    private boolean isContainsLogAttributeFilter(String expectedValue) {
        return expectedValue != null && expectedValue.startsWith(LOG_FILTER_CONTAINS_PREFIX);
    }

    private boolean isNotContainsLogAttributeFilter(String expectedValue) {
        return expectedValue != null && expectedValue.startsWith(LOG_FILTER_NOT_CONTAINS_PREFIX);
    }

    private boolean isExistsLogAttributeFilter(String expectedValue) {
        return LOG_FILTER_EXISTS_PREFIX.equals(expectedValue);
    }

    private boolean isNotExistsLogAttributeFilter(String expectedValue) {
        return LOG_FILTER_NOT_EXISTS_PREFIX.equals(expectedValue);
    }

    private List<String> splitListLogAttributeValues(String encodedValues) {
        if (!StringUtils.hasText(encodedValues)) {
            return List.of();
        }
        return List.of(encodedValues.split(Pattern.quote(LOG_FILTER_VALUE_DELIMITER), -1)).stream()
                .filter(StringUtils::hasText)
                .toList();
    }

    private boolean shouldHideWorkspaceLog(LogEntry logEntry, boolean hideInternal, boolean hideNoise) {
        return new LogVisibilityFilter(hideInternal, hideNoise).hides(resolveServiceName(logEntry));
    }

    private boolean matchesServiceContext(LogEntry logEntry, String serviceName, String serviceNamespace,
                                          String environment) {
        return matchesOptionalResourceValue(resolveServiceName(logEntry), serviceName)
                && matchesOptionalResourceValue(resolveResourceValue(logEntry,
                        "service.namespace", "service_namespace"), serviceNamespace)
                && matchesOptionalResourceValue(resolveResourceValue(logEntry,
                        "deployment.environment.name", "deployment_environment_name", "environment"), environment);
    }

    private boolean matchesOptionalResourceValue(String actualValue, String expectedValue) {
        if (!StringUtils.hasText(expectedValue)) {
            return true;
        }
        return StringUtils.hasText(actualValue)
                && actualValue.equalsIgnoreCase(expectedValue.trim());
    }

    private boolean matchesContainedResourceValue(String actualValue, String expectedValue) {
        if (!StringUtils.hasText(expectedValue)) {
            return true;
        }
        return StringUtils.hasText(actualValue)
                && actualValue.toLowerCase(Locale.ROOT).contains(expectedValue.trim().toLowerCase(Locale.ROOT));
    }


    private boolean matchesWorkspace(LogEntry logEntry, String workspaceId) {
        if (!StringUtils.hasText(workspaceId)) {
            return !TelemetrySourceContext.isSelf();
        }
        String logWorkspaceId = resolveWorkspaceId(logEntry);
        if (!StringUtils.hasText(logWorkspaceId)) {
            return !TelemetrySourceContext.isSelf()
                    && AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(workspaceId);
        }
        return workspaceId.equals(AuthTokenScopes.normalizeWorkspaceId(logWorkspaceId));
    }

    private String resolveWorkspaceId(LogEntry logEntry) {
        if (logEntry == null || logEntry.getResource() == null || logEntry.getResource().isEmpty()) {
            return null;
        }
        for (String key : OtlpResourceSemanticAttributes.HERTZBEAT_WORKSPACE_ID_KEYS_IN_PRECEDENCE_ORDER) {
            String value = normalizeRawValue(logEntry.getResource().get(key));
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String resolveServiceName(LogEntry logEntry) {
        return resolveResourceValue(logEntry, "service.name", "service_name");
    }

    private String resolveLogGroupValue(LogEntry logEntry, String groupBy) {
        if (!StringUtils.hasText(groupBy)) {
            return "unknown";
        }
        String normalized = groupBy.trim();
        String value;
        if ("service.name".equalsIgnoreCase(normalized) || "service_name".equalsIgnoreCase(normalized)) {
            value = resolveServiceName(logEntry);
        } else if ("severity".equalsIgnoreCase(normalized) || "severity_text".equalsIgnoreCase(normalized)) {
            value = normalizeRawValue(logEntry == null ? null : logEntry.getSeverityText());
        } else if (normalized.startsWith("resource:")) {
            value = resolveMapValue(logEntry == null ? null : logEntry.getResource(),
                    normalized.substring("resource:".length()));
        } else if (normalized.startsWith("attribute:")) {
            value = resolveMapValue(logEntry == null ? null : logEntry.getAttributes(),
                    normalized.substring("attribute:".length()));
        } else {
            value = resolveResourceValue(logEntry, normalized);
        }
        return StringUtils.hasText(value) ? value : "unknown";
    }

    private String resolveResourceValue(LogEntry logEntry, String... keys) {
        if (logEntry == null || keys == null || keys.length == 0) {
            return null;
        }
        String value = resolveMapValue(logEntry.getResource(), keys);
        if (!StringUtils.hasText(value)) {
            value = resolveMapValue(logEntry.getAttributes(), keys);
        }
        return value;
    }

    private String resolveMapValue(Map<String, Object> source, String... keys) {
        if (source == null || source.isEmpty()) {
            return null;
        }
        for (String key : keys) {
            String value = normalizeResourceValue(source.get(key));
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String normalizeRawValue(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        String normalized = String.valueOf(rawValue).trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeResourceValue(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        String normalized = String.valueOf(rawValue).trim().toLowerCase();
        return normalized.isEmpty() ? null : normalized;
    }
}
