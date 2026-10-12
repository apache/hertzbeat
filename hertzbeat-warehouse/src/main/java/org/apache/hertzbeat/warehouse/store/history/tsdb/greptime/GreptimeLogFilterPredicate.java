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

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/** SQL equivalent of the existing history fallback's encoded attribute predicates. */
final class GreptimeLogFilterPredicate {
    private GreptimeLogFilterPredicate() { }

    static boolean complex(String value) {
        return value != null && (value.startsWith("__hz_in__:") || value.startsWith("__hz_not_in__:")
                || value.startsWith("__hz_contains__:") || value.startsWith("__hz_not_contains__:")
                || value.equals("__hz_exists__") || value.equals("__hz_not_exists__"));
    }

    static String condition(String column, String key, String encoded) {
        if (!List.of("resource_attributes", "log_attributes").contains(column) || !key.matches("[A-Za-z0-9_.:-]+")) {
            throw new IllegalArgumentException("Invalid log field");
        }
        String path = "'$[\"" + key + "\"]'";
        String value = "NULLIF(TRIM(json_get_string(" + column + ", " + path + ")), '')";
        String exists = "COALESCE(json_path_exists(" + column + ", " + path + "), false)";
        if (encoded.equals("__hz_exists__")) {
            return exists;
        }
        if (encoded.equals("__hz_not_exists__")) {
            return "NOT " + exists;
        }
        boolean notIn = encoded.startsWith("__hz_not_in__:");
        if (notIn || encoded.startsWith("__hz_in__:")) {
            String raw = encoded.substring((notIn ? "__hz_not_in__:" : "__hz_in__:").length());
            String choices = Arrays.stream(raw.split("\u001F", -1)).filter(item -> !item.isBlank())
                    .map(item -> "LOWER(" + literal(item.trim()) + ")").collect(Collectors.joining(", "));
            if (choices.isEmpty()) {
                return notIn ? "true" : "false";
            }
            String match = "LOWER(" + value + ") IN (" + choices + ")";
            return notIn ? "NOT COALESCE(" + match + ", false)" : "COALESCE(" + match + ", false)";
        }
        boolean notContains = encoded.startsWith("__hz_not_contains__:");
        if (notContains || encoded.startsWith("__hz_contains__:")) {
            String raw = encoded.substring((notContains ? "__hz_not_contains__:" : "__hz_contains__:").length()).trim();
            String match = "strpos(LOWER(" + value + "), LOWER(" + literal(raw) + ")) > 0";
            return notContains ? "NOT COALESCE(" + match + ", false)" : "COALESCE(" + match + ", false)";
        }
        boolean negated = encoded.startsWith("!");
        String expected = negated ? encoded.substring(1) : encoded;
        String match = "LOWER(" + value + ") = LOWER(" + literal(expected.trim()) + ")";
        return negated ? "NOT COALESCE(" + match + ", false)" : "COALESCE(" + match + ", false)";
    }

    private static String literal(String value) {
        return "'" + value.replace("'", "''") + "'";
    }
}
