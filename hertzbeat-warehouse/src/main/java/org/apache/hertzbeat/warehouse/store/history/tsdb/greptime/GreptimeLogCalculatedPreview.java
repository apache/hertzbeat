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

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogCalculated;
import org.apache.hertzbeat.common.observability.query.LogCalculatedExtraction;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.web.client.HttpStatusCodeException;
import tools.jackson.databind.json.JsonMapper;

/** Native sample-only extraction; this query never reads the log table. */
final class GreptimeLogCalculatedPreview {
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private GreptimeLogCalculatedPreview() { }

    static void checkPattern(GreptimeSqlQueryExecutor executor, String pattern) {
        try { executor.executeStrict("SELECT regexp_like('', " + quote(pattern) + ") AS valid"); }
        catch (RuntimeException failure) {
            if (nativePatternError(failure)) {
                throw new LogCalculatedFormula.ValidationException("invalid_pattern", "calculatedFields");
            }
            throw failure;
        }
    }

    static LogCalculated.Preview read(GreptimeSqlQueryExecutor executor, LogCalculated.Definition definition,
                                      String sample) {
        try { return map(executor.executeStrict(sql(definition, sample)), definition); }
        catch (RuntimeException failure) {
            if (nativePatternError(failure)) {
                throw new LogCalculatedFormula.ValidationException("invalid_pattern", "calculatedFields");
            }
            throw failure;
        }
    }

    static String sql(LogCalculated.Definition definition, String sample) {
        var compiled = LogCalculatedExtraction.compile(definition.engine(), definition.pattern());
        var columns = new ArrayList<String>();
        for (var group : compiled.groups()) {
            String value = "array_element(regexp_match(source_text, "
                    + quote(LogCalculatedExtraction.capturePattern(compiled, group)) + "), 1)";
            if ("number".equals(group.type())) { value = GreptimeLogCalculatedFormula.numeric(value); }
            columns.add(value + " AS c_" + (group.index() - 1));
        }
        return "SELECT " + String.join(", ", columns) + " FROM (SELECT " + quote(sample)
                + " AS source_text) extracted";
    }

    static LogCalculated.Preview map(List<Map<String, Object>> rows, LogCalculated.Definition definition) {
        if (rows == null || rows.size() != 1) { throw new IllegalArgumentException("Invalid extraction preview"); }
        var values = new LinkedHashMap<String, Object>();
        for (int index = 0; index < definition.outputs().size(); index++) {
            String key = "c_" + index;
            if (!rows.getFirst().containsKey(key)) { throw new IllegalArgumentException("Missing extraction capture"); }
            Object value = rows.getFirst().get(key);
            String type = definition.outputs().get(index).type();
            if (value != null && "number".equals(type)) {
                double number = Double.parseDouble(value.toString());
                value = Double.isFinite(number) ? number : null;
            } else if (value != null && !(value instanceof String)) {
                throw new IllegalArgumentException("Invalid extraction capture");
            }
            values.put(definition.outputs().get(index).name(), value);
        }
        return new LogCalculated.Preview(definition.id(), Collections.unmodifiableMap(values));
    }

    private static String quote(String value) { return "'" + value.replace("'", "''") + "'"; }

    static boolean nativePatternError(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof HttpStatusCodeException response && response.getStatusCode().value() == 500) {
                try {
                    String error = MAPPER.readTree(response.getResponseBodyAsString()).path("error").asString();
                    return error.startsWith("Compute error: Regular expression did not compile:")
                            || error.startsWith("regex parse error:");
                } catch (RuntimeException malformed) { return false; }
            }
        }
        return false;
    }
}
