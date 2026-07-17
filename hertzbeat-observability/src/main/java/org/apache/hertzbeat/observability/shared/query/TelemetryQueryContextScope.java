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

package org.apache.hertzbeat.observability.shared.query;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpMetricSemanticLabels;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.springframework.util.StringUtils;

/**
 * Storage-neutral mapping for the optional instance and HTTP route query context.
 *
 * <p>The endpoint field is deliberately limited to a low-cardinality HTTP route template. RPC,
 * messaging, database, HTTP method, and URL semantics require separately versioned fields.</p>
 */
public record TelemetryQueryContextScope(String instance, String endpoint) {

    private static final String HTTP_ROUTE = "http.route";
    private static final int MAX_INSTANCE_LENGTH = 256;
    private static final int MAX_ENDPOINT_LENGTH = 512;
    private static final Pattern FILTER_KEY_PATTERN = Pattern.compile(
            "^\\s*([A-Za-z_][A-Za-z0-9_.-]*)\\s*(?:!=|=~|!~|=|:|\\s+(?:not\\s+)?(?:in|contains|exists)\\b)",
            Pattern.CASE_INSENSITIVE);

    public TelemetryQueryContextScope {
        instance = normalizeInstance(instance);
        endpoint = normalizeEndpoint(endpoint);
    }

    public String applyMetricFilter(String filter) {
        String scoped = appendExactFilter(filter, OtlpMetricSemanticLabels.SERVICE_INSTANCE_ID, instance);
        return appendExactFilter(scoped, OtlpMetricSemanticLabels.HTTP_ROUTE, endpoint);
    }

    public String applyResourceFilter(String filter) {
        return appendExactFilter(filter, OtlpResourceSemanticAttributes.SERVICE_INSTANCE_ID, instance);
    }

    public String applyAttributeFilter(String filter) {
        return appendExactFilter(filter, HTTP_ROUTE, endpoint);
    }

    private static String appendExactFilter(String filter, String key, String value) {
        String normalizedFilter = StringUtils.trimWhitespace(filter);
        if (!StringUtils.hasText(value)) {
            return normalizedFilter;
        }
        if (containsFilterKey(normalizedFilter, key)) {
            throw new IllegalArgumentException(key + " must use the dedicated query parameter");
        }
        String exactFilter = key + "=\"" + value + "\"";
        return StringUtils.hasText(normalizedFilter) ? normalizedFilter + " and " + exactFilter : exactFilter;
    }

    private static String normalizeInstance(String value) {
        String normalized = normalizeSafeValue(value, "Instance", MAX_INSTANCE_LENGTH);
        return StringUtils.hasText(normalized) ? normalized : null;
    }

    private static String normalizeEndpoint(String value) {
        String normalized = normalizeSafeValue(value, "Endpoint", MAX_ENDPOINT_LENGTH);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        if (normalized.indexOf('#') >= 0 || normalized.startsWith("//") || normalized.contains("://")
                || normalized.chars().anyMatch(Character::isWhitespace) || hasQueryString(normalized)) {
            throw new IllegalArgumentException("Endpoint must be a low-cardinality HTTP route template");
        }
        return normalized;
    }

    private static boolean hasQueryString(String route) {
        for (int index = route.indexOf('?'); index >= 0; index = route.indexOf('?', index + 1)) {
            boolean braceOptionalParameter = index + 1 < route.length() && route.charAt(index + 1) == '}';
            int segmentStart = route.lastIndexOf('/', index - 1) + 1;
            boolean colonOptionalParameter = segmentStart < index && route.charAt(segmentStart) == ':'
                    && (index + 1 == route.length() || route.charAt(index + 1) == '/');
            if (!braceOptionalParameter && !colonOptionalParameter) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsFilterKey(String filter, String key) {
        if (!StringUtils.hasText(filter)) {
            return false;
        }
        for (String clause : splitFilterClauses(filter)) {
            Matcher matcher = FILTER_KEY_PATTERN.matcher(clause);
            if (matcher.find() && key.equals(matcher.group(1))) {
                return true;
            }
        }
        return false;
    }

    private static List<String> splitFilterClauses(String filter) {
        List<String> clauses = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int depth = 0;
        char quote = 0;
        for (int index = 0; index < filter.length(); index++) {
            char character = filter.charAt(index);
            if (quote != 0) {
                current.append(character);
                if (character == quote) {
                    quote = 0;
                }
                continue;
            }
            if (character == '\'' || character == '"') {
                quote = character;
                current.append(character);
            } else if (character == '(') {
                depth++;
                current.append(character);
            } else if (character == ')') {
                depth = Math.max(0, depth - 1);
                current.append(character);
            } else if (depth == 0 && character == ',') {
                addFilterClause(clauses, current);
            } else if (depth == 0 && index + 5 <= filter.length()
                    && filter.regionMatches(true, index, " and ", 0, 5)) {
                addFilterClause(clauses, current);
                index += 4;
            } else {
                current.append(character);
            }
        }
        addFilterClause(clauses, current);
        return clauses;
    }

    private static void addFilterClause(List<String> clauses, StringBuilder current) {
        String clause = StringUtils.trimWhitespace(current.toString());
        if (StringUtils.hasText(clause)) {
            clauses.add(clause);
        }
        current.setLength(0);
    }

    private static String normalizeSafeValue(String value, String label, int maxLength) {
        String normalized = StringUtils.trimWhitespace(value);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        if (normalized.length() > maxLength || normalized.indexOf('"') >= 0 || normalized.indexOf('\\') >= 0
                || normalized.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException(label + " contains unsupported characters");
        }
        return normalized;
    }
}
