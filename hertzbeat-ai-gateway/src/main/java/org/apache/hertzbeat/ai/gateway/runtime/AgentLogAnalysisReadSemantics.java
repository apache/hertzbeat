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

package org.apache.hertzbeat.ai.gateway.runtime;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.tool.log.AgentLogQuery;
import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.observability.logs.query.LogAnalysisGroupingParser;
import org.apache.hertzbeat.observability.logs.query.LogAnalysisMeasureParser;

/** Verifies the producer's bounded analysis contract, including an ungrouped full-window count. */
final class AgentLogAnalysisReadSemantics {
    private static final JsonMapper JSON = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .enable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES).build();
    private static final Set<String> REQUIRED = Set.of("window", "field", "view", "limit", "order", "minCount",
            "matchingTotal", "truncated", "intervalMs", "groups");

    AgentReadObservationClassifier.Observation classify(Map<String, Object> arguments, Map<String, Object> data) {
        if (arguments == null || data == null || !data.keySet().containsAll(REQUIRED)) {
            return null;
        }
        try {
            AgentLogQuery query = JSON.convertValue(arguments.get("q"), AgentLogQuery.class);
            if (query == null) { return null; }
            query.validateOperation("analysis");
            LogAnalysis.Request expected = request(query);
            LogAnalysis.Result result = JSON.convertValue(data, LogAnalysis.Result.class);
            if (!matches(query, expected, result)) { return null; }
            if (result.field() == null && result.grouping() == null) {
                if (!completePopulation(result)) { return null; }
                // The reference counts verified aggregates, never narrows the producer's long population total.
                return new AgentReadObservationClassifier.Observation("log-aggregate", result.matchingTotal() == 0 ? 0 : 1);
            }
            return new AgentReadObservationClassifier.Observation("log-analysis-groups", result.groups().size());
        } catch (IllegalArgumentException | ArithmeticException invalid) {
            return null;
        }
    }

    LogAnalysis.Request request(AgentLogQuery query) {
        var grouping = LogAnalysisGroupingParser.parse(query.grouping());
        var measure = LogAnalysisMeasureParser.parse(query.measure());
        int limit = query.limit() == null ? 20 : query.limit();
        if (grouping != null) { limit = grouping.limit(); }
        String order = measure == null ? "count-desc" : "measure-desc";
        if (query.order() != null) { order = query.order(); }
        return new LogAnalysis.Request(query.field() == null ? null : LogFacets.Field.parse(query.field()),
                query.view() == null ? "groups" : query.view(), limit, order,
                query.minCount() == null ? 1 : query.minCount(), measure, grouping, query.intervalMs(),
                LogAnalysisMeasureParser.parseAdditional(query.additionalMeasures()), query.transform());
    }

    private boolean matches(AgentLogQuery query, LogAnalysis.Request expected, LogAnalysis.Result result) {
        return result.window() != null && result.window().start() == query.start() && result.window().end() == query.end()
                && Objects.equals(expected.field(), result.field()) && Objects.equals(expected.grouping(), result.grouping())
                && Objects.equals(expected.measure(), result.measure()) && Objects.equals(expected.view(), result.view())
                && expected.limit() == result.limit() && Objects.equals(expected.order(), result.order())
                && expected.minCount() == result.minCount()
                && Objects.equals(expected.additionalMeasures(), result.additionalMeasures())
                && Objects.equals(expected.transform(), result.transform())
                && (query.intervalMs() == null || Objects.equals(query.intervalMs(), result.intervalMs()))
                && result.groups().stream().allMatch(group -> group.count() >= result.minCount());
    }

    private boolean completePopulation(LogAnalysis.Result result) {
        if (result.truncated()) { return false; }
        if (result.matchingTotal() < result.minCount()) { return result.groups().isEmpty(); }
        return result.groups().size() == 1 && "all".equals(result.groups().getFirst().kind())
                && result.groups().getFirst().count() == result.matchingTotal();
    }
}
