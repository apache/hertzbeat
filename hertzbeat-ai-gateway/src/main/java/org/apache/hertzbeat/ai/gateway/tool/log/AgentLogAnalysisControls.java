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

import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.observability.logs.query.LogAnalysisGroupingParser;
import org.apache.hertzbeat.observability.logs.query.LogAnalysisMeasureParser;

/** Validates the same structured controls as the product before entering its HTTP error projection. */
final class AgentLogAnalysisControls {
    private AgentLogAnalysisControls() { }

    static void validate(AgentLogQuery query) {
        try {
            var grouping = LogAnalysisGroupingParser.parse(query.grouping());
            if (grouping != null && (query.field() != null || query.limit() != null)) {
                throw new IllegalArgumentException("grouping cannot be combined with field or limit");
            }
            var field = query.field() == null ? null : LogFacets.Field.parse(query.field());
            var measure = LogAnalysisMeasureParser.parse(query.measure());
            int limit = grouping == null ? (query.limit() == null ? 20 : query.limit()) : grouping.limit();
            String order = query.order() == null ? (measure == null ? "count-desc" : "measure-desc") : query.order();
            new LogAnalysis.Request(field, query.view() == null ? "groups" : query.view(), limit, order,
                    query.minCount() == null ? 1 : query.minCount(), measure, grouping, query.intervalMs(),
                    LogAnalysisMeasureParser.parseAdditional(query.additionalMeasures()), query.transform());
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("logs.analysis: use qualified field such as builtin:serviceName with limit; "
                    + "grouping and measure require JSON strings, not plain names. Omit measure for counts, use "
                    + "order=count-desc and view=groups; when grouping is supplied omit field and limit. " + invalid.getMessage(), invalid);
        }
    }
}
