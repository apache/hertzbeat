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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;

/** Relational UTF-8 byte entropy for the already admitted log population. */
final class GreptimeLogCalculatedEntropy {
    private final List<String> ctes;
    private final Map<String, String> columns;
    private final Map<String, String> types;
    private String source;
    private int ordinal;

    GreptimeLogCalculatedEntropy(List<String> ctes, String source, Map<String, String> columns,
                                 Map<String, String> types, int ordinal) {
        this.ctes = ctes;
        this.source = source;
        this.columns = new HashMap<>(columns);
        this.types = new HashMap<>(types);
        this.ordinal = ordinal;
    }

    LogCalculatedFormula.Node rewrite(LogCalculatedFormula.Node node) {
        return switch (node) {
            case LogCalculatedFormula.Call call -> rewriteCall(call);
            case LogCalculatedFormula.Unary unary -> new LogCalculatedFormula.Unary(
                    unary.operator(), rewrite(unary.operand()));
            case LogCalculatedFormula.Binary binary -> new LogCalculatedFormula.Binary(
                    binary.operator(), rewrite(binary.left()), rewrite(binary.right()));
            default -> node;
        };
    }

    private LogCalculatedFormula.Node rewriteCall(LogCalculatedFormula.Call call) {
        var arguments = call.arguments().stream().map(this::rewrite).toList();
        if (!"entropy".equals(call.name())) { return new LogCalculatedFormula.Call(call.name(), arguments); }
        String name = "__entropy_" + ordinal;
        String column = "entropy_value_" + ordinal;
        String input = "entropy_input_" + ordinal;
        String inputValue = "entropy_source_" + ordinal;
        String distinct = "entropy_distinct_" + ordinal;
        String positions = "entropy_positions_" + ordinal;
        String bytes = "entropy_bytes_" + ordinal;
        String frequencies = "entropy_frequencies_" + ordinal;
        String window = "entropy_window_" + ordinal;
        String values = "entropy_values_" + ordinal;
        String joined = "entropy_joined_" + ordinal++;
        String expression = GreptimeLogCalculatedFormula.sql(arguments.getFirst(), columns, types);
        ctes.add(input + " AS (SELECT *, " + expression + " AS " + inputValue + " FROM " + source + ")");
        ctes.add(distinct + " AS (SELECT DISTINCT " + inputValue + " FROM " + input
                + " WHERE " + inputValue + " IS NOT NULL AND " + inputValue + " <> '')");
        ctes.add(positions + " AS (SELECT " + inputValue + ", "
                + "unnest(range(0, octet_length(" + inputValue + "))) AS pos FROM " + distinct + ")");
        ctes.add(bytes + " AS (SELECT " + inputValue + ", substring(encode(" + inputValue + ", 'hex'), "
                + "2 * pos + 1, 2) AS byte_value FROM " + positions + ")");
        ctes.add(frequencies + " AS (SELECT " + inputValue + ", byte_value, count(*) AS frequency FROM "
                + bytes + " GROUP BY " + inputValue + ", byte_value)");
        String probability = "(" + frequencies + ".frequency * 1.0 / octet_length("
                + frequencies + "." + inputValue + "))";
        ctes.add(window + " AS (SELECT " + frequencies + "." + inputValue + ", " + frequencies
                + ".byte_value, -sum(" + probability + " * log2(" + probability + ")) OVER (PARTITION BY "
                + frequencies + "." + inputValue + ") AS entropy_value, row_number() OVER (PARTITION BY "
                + frequencies + "." + inputValue + " ORDER BY " + frequencies + ".byte_value) AS pick FROM "
                + frequencies + ")");
        ctes.add(values + " AS (SELECT " + inputValue + ", entropy_value FROM " + window + " WHERE pick = 1)");
        ctes.add(joined + " AS (SELECT " + input + ".*, CASE WHEN " + input + "." + inputValue + " IS NULL THEN NULL"
                + " WHEN octet_length(" + input + "." + inputValue + ") = 0 THEN 0.0 ELSE " + values
                + ".entropy_value END AS " + column + " FROM " + input + " LEFT JOIN " + values
                + " ON " + input + "." + inputValue + " = " + values + "." + inputValue + ")");
        source = joined;
        columns.put(name, column);
        types.put(name, "number");
        return new LogCalculatedFormula.Derived(name);
    }

    String source() { return source; }

    int ordinal() { return ordinal; }

    Map<String, String> columns() { return columns; }

    Map<String, String> types() { return types; }
}
