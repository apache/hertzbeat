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

package org.apache.hertzbeat.common.observability.dto.log;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/** Exact string-identity expansion inside one immutable authorized population. */
public final class LogTransactions {
    private LogTransactions() { }

    /** Bounded exact identity aggregation controls. */
    public record Request(int version, LogFacets.Field field, int limit, String order) {
        public Request {
            validField(field);
            if (version != 1 || limit < 1 || limit > 100 || !"related-count-desc".equals(order)) {
                throw new IllegalArgumentException("Invalid transaction request");
            }
        }
    }

    /** Server-built trusted population and independent seed predicates. */
    public record Query(LogFacets.Scope population, LogComparison.Source seed, Request request) {
        public Query {
            Objects.requireNonNull(population);
            Objects.requireNonNull(seed);
            Objects.requireNonNull(request);
            var scope = seed.scope();
            if (population.search() != null || population.severityNumber() != null || population.severityText() != null
                    || population.severityCategory() != null || population.numericRange() != null
                    || !context(population).equals(context(scope))
                    || !scope.resourceFilters().entrySet().containsAll(population.resourceFilters().entrySet())
                    || !scope.attributeFilters().entrySet().containsAll(population.attributeFilters().entrySet())) {
                throw new IllegalArgumentException("Transaction seed must retain trusted population");
            }
        }
    }

    /** Selected identity and independent local search, without alternate scope. */
    public record Detail(String identity, String literal, LogSearchExpression expression, int offset, int limit, String sort) {
        public Detail {
            validIdentity(identity);
            validPage(offset, limit, sort);
            Objects.requireNonNull(expression);
            if (literal != null && (literal.length() > 512
                    || !(expression instanceof LogSearchExpression.And and && and.children().isEmpty()))) {
                throw new IllegalArgumentException("Invalid transaction local literal");
            }
        }
    }

    /** Observed same-window transaction summary. */
    public record Item(String identity, long seedCount, long relatedCount, String firstTimeUnixNano,
                       String lastTimeUnixNano, String durationNanos, LogSeverityCategory maximumSeverity) {
        public Item {
            validIdentity(identity);
            long first = nanos(firstTimeUnixNano);
            long last = nanos(lastTimeUnixNano);
            long duration = nanos(durationNanos);
            if (seedCount < 1 || relatedCount < seedCount || first < 1 || last < first || last - first != duration) {
                throw new IllegalArgumentException("Invalid transaction observation");
            }
        }
    }

    /** Complete seed and related populations with bounded ranked observations. */
    public record Result(LogFacets.Window window, Request request, long seedLogCount, long usableSeedLogCount,
                         long oversizedSeedLogCount, long otherExcludedSeedLogCount, long transactionCount,
                         long relatedLogCount, boolean truncated, List<Item> items) {
        public Result {
            Objects.requireNonNull(window);
            Objects.requireNonNull(request);
            items = List.copyOf(items);
            if (seedLogCount < 0 || usableSeedLogCount < 0 || oversizedSeedLogCount < 0 || otherExcludedSeedLogCount < 0
                    || transactionCount < 0 || usableSeedLogCount < transactionCount || relatedLogCount < usableSeedLogCount
                    || seedLogCount != Math.addExact(usableSeedLogCount, Math.addExact(oversizedSeedLogCount, otherExcludedSeedLogCount))
                    || items.size() != Math.min(transactionCount, request.limit()) || truncated != (transactionCount > request.limit())) {
                throw new IllegalArgumentException("Invalid transaction population counters");
            }
            validateItems(window, items, usableSeedLogCount, relatedLogCount, truncated);
        }
    }

    /** Current seed qualification and lossless paginated related rows. */
    public record DetailResult(LogFacets.Window window, LogFacets.Field field, String identity, boolean qualified,
                               Long total, List<HistoricalLogRow> rows, int offset, int limit, String sort) {
        public DetailResult {
            Objects.requireNonNull(window);
            validField(field);
            validIdentity(identity);
            validPage(offset, limit, sort);
            rows = List.copyOf(rows);
            if (!qualified ? total != null || !rows.isEmpty()
                    : total == null || total < 0 || rows.size() != Math.min(limit, Math.max(0L, total - offset))) {
                throw new IllegalArgumentException("Invalid transaction detail population");
            }
        }
    }

    private static void validField(LogFacets.Field field) {
        if (field == null || !LogFacets.Field.parse(field.id()).equals(field) || "builtin".equals(field.source())
                || Set.of("hertzbeat_workspace_id", "workspace_id", "hertzbeat_entity_id").contains(field.key().replace('.', '_'))) {
            throw new IllegalArgumentException("Invalid transaction identity field");
        }
    }

    private static void validIdentity(String identity) {
        if (identity == null || identity.isEmpty() || identity.length() > 1024 || !StandardCharsets.UTF_8.newEncoder().canEncode(identity)) {
            throw new IllegalArgumentException("Invalid transaction identity");
        }
    }

    private static void validPage(int offset, int limit, String sort) {
        if (offset < 0 || limit < 1 || limit > 100 || (long) offset + limit > Integer.MAX_VALUE
                || !("oldest".equals(sort) || "newest".equals(sort))) {
            throw new IllegalArgumentException("Invalid transaction page");
        }
    }

    private static long nanos(String value) {
        long parsed = Long.parseLong(value);
        if (parsed < 0 || !Long.toString(parsed).equals(value)) { throw new IllegalArgumentException("Invalid nanosecond value"); }
        return parsed;
    }

    private static List<Object> context(LogFacets.Scope scope) {
        return Arrays.asList(scope.workspaceId(), scope.start(), scope.end(), scope.traceId(), scope.spanId(),
                scope.serviceName(), scope.serviceNamespace(), scope.environment(), scope.excludedServiceNames(), scope.requireServiceName());
    }

    private static void validateItems(LogFacets.Window window, List<Item> items, long seeds, long related, boolean truncated) {
        var identities = new HashSet<String>();
        long selectedSeeds = 0;
        long selectedRelated = 0;
        long previousCount = Long.MAX_VALUE;
        var lower = BigInteger.valueOf(window.start()).multiply(BigInteger.valueOf(1_000_000));
        var upper = BigInteger.valueOf(window.end()).multiply(BigInteger.valueOf(1_000_000));
        for (var item : items) {
            if (!identities.add(item.identity()) || item.relatedCount() > previousCount
                    || new BigInteger(item.firstTimeUnixNano()).compareTo(lower) < 0
                    || new BigInteger(item.lastTimeUnixNano()).compareTo(upper) > 0) {
                throw new IllegalArgumentException("Invalid ordered transaction observation");
            }
            selectedSeeds = Math.addExact(selectedSeeds, item.seedCount());
            selectedRelated = Math.addExact(selectedRelated, item.relatedCount());
            previousCount = item.relatedCount();
        }
        if (selectedSeeds > seeds || selectedRelated > related || (!truncated && (selectedSeeds != seeds || selectedRelated != related))) {
            throw new IllegalArgumentException("Incomplete transaction observations");
        }
    }
}
