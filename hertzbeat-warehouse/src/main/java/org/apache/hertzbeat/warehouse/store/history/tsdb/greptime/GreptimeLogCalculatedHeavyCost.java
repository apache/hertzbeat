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
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.query.LogCalculatedFormula;

/** Conservative work admission for native regex, edit distance, and byte entropy calls. */
final class GreptimeLogCalculatedHeavyCost {
    private final List<String> regex = new ArrayList<>();
    private final List<String> distance = new ArrayList<>();
    private final List<String> entropy = new ArrayList<>();
    private int calls;

    void collect(LogCalculatedFormula.Node node, Map<String, LogCalculatedFormula.Expansion> dependencies) {
        switch (node) {
            case LogCalculatedFormula.Call call -> {
                if ("regexp_like".equals(call.name()) || "regexp_replace".equals(call.name())) {
                    regex.add(bytes(call.arguments().getFirst(), dependencies));
                    count();
                } else if ("levenshtein_distance".equals(call.name())) {
                    distance.add("(" + bytes(call.arguments().getFirst(), dependencies) + " * "
                            + bytes(call.arguments().get(1), dependencies) + ")");
                    count();
                } else if ("entropy".equals(call.name())) {
                    entropy.add(bytes(call.arguments().getFirst(), dependencies));
                    count();
                }
                call.arguments().forEach(argument -> collect(argument, dependencies));
            }
            case LogCalculatedFormula.Unary unary -> collect(unary.operand(), dependencies);
            case LogCalculatedFormula.Binary binary -> {
                collect(binary.left(), dependencies);
                collect(binary.right(), dependencies);
            }
            default -> { }
        }
    }

    boolean required() { return calls > 0; }

    String regex() { return terms(regex); }

    String distance() { return terms(distance); }

    String entropy() { return terms(entropy); }

    private static String bytes(LogCalculatedFormula.Node node,
                                Map<String, LogCalculatedFormula.Expansion> dependencies) {
        var expansion = LogCalculatedFormula.expansion(node, dependencies);
        return "(" + expansion.literalBytes() + " + " + expansion.rawCopies()
                + " * CAST(input_bytes AS DOUBLE))";
    }

    private static String terms(List<String> values) {
        return values.isEmpty() ? "0" : String.join(" + ", values);
    }

    private void count() {
        if (++calls > 8) {
            throw new LogCalculatedFormula.ValidationException("budget_exceeded", "calculatedFields");
        }
    }
}
