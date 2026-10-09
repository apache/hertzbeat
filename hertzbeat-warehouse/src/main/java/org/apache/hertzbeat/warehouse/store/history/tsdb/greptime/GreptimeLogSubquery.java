/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;

/** Ranked child set and main semijoin/antijoin over one trusted scoped population. */
final class GreptimeLogSubquery {
    private GreptimeLogSubquery() { }

    static List<String> ctes(LogCalculated.Query query, String source, String rawSort) {
        var descriptor = query.subquery().descriptor();
        String selection = query.selection() == null ? "" : " AND "
                + GreptimeLogGroupProjection.selection(query.selection());
        String childKey = GreptimeLogFacets.expression(LogFacets.Field.parse(descriptor.child().field()));
        String mainKey = GreptimeLogFacets.expression(LogFacets.Field.parse(descriptor.mainField()));
        String childPredicate = GreptimeLogCalculatedPage.search(query.subquery().childSearch(), Map.of(), Map.of());
        String mainPredicate = GreptimeLogCalculatedPage.search(query.search(), Map.of(), Map.of());
        var measure = descriptor.rank().measure();
        boolean distinct = "count_distinct".equals(measure.function());
        String childMetric = distinct
                ? ", " + GreptimeLogFacets.expression(LogFacets.Field.parse(measure.field())) + " AS sort_value"
                : "";
        String count = distinct ? "COUNT(DISTINCT sort_value)" : "COUNT(*)";
        String order = "top".equals(descriptor.rank().direction()) ? "DESC" : "ASC";
        String keep = "in".equals(descriptor.operator()) ? "IS NOT NULL" : "IS NULL";
        return List.of(
                "subquery_child AS (SELECT " + childKey + " AS child_key" + childMetric + " FROM " + source
                        + " WHERE " + childPredicate + selection + ")",
                "subquery_counts AS (SELECT child_key, " + count + " AS child_count FROM subquery_child"
                        + " WHERE child_key IS NOT NULL GROUP BY child_key)",
                "subquery_ranked AS (SELECT child_key, ROW_NUMBER() OVER (ORDER BY child_count " + order
                        + ", child_key ASC) AS ordinal FROM subquery_counts)",
                "subquery_top AS (SELECT child_key FROM subquery_ranked WHERE ordinal <= "
                        + descriptor.rank().limit() + ")",
                "subquery_main AS (SELECT *, " + mainKey + " AS main_key" + rawSort + " FROM " + source
                        + " WHERE " + mainPredicate + selection + ")",
                "filtered AS (SELECT subquery_main.* FROM subquery_main LEFT JOIN subquery_top"
                        + " ON subquery_main.main_key = subquery_top.child_key WHERE subquery_top.child_key " + keep + ")");
    }
}
