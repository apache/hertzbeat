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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import org.apache.hertzbeat.common.observability.dto.log.LogAnalysis;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSort;

/** Native ordering precedes pagination; timestamp and persisted UID retain their original values. */
final class GreptimeLogSort {
    private GreptimeLogSort() { }

    static String suffix(LogSort sort, int offset, int limit) {
        if (sort == null || offset < 0 || limit < 1 || limit > 1000) {
            throw new IllegalArgumentException("Invalid sorted log page");
        }
        return " ORDER BY raw_sort_value" + ("asc".equals(sort.direction()) ? " ASC" : " DESC")
                + " NULLS LAST, timestamp DESC, log_record_uid DESC LIMIT " + limit + " OFFSET " + offset;
    }

    static String projection(LogSort sort) {
        var field = LogFacets.Field.parse(sort.field());
        String value = GreptimeLogFacets.expression(field);
        if ("number".equals(sort.type())) {
            value = GreptimeLogMeasurement.sample(new LogAnalysis.Measure("min", sort.field()));
        } else if (!"builtin".equals(field.source())) {
            String column = "resource".equals(field.source()) ? "resource_attributes" : "log_attributes";
            value = "CASE WHEN " + GreptimeStructuredLogPredicate.stringAt(column, field.key()) + " THEN " + value + " END";
        }
        // ORDER BY resolves the display JSON aliases as text. Evaluate against raw columns in SELECT instead.
        return value + " AS raw_sort_value";
    }
}
