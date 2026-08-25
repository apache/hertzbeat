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

package org.apache.hertzbeat.alert.service.impl;

import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.support.exception.AlertExpressionException;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;

import java.math.BigInteger;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Applies the resource budget shared by alert previews and periodic evaluation.
 *
 * <p>The query endpoint uses warehouse credentials and an alert definition runs repeatedly,
 * so accepting a read-only query is not sufficient on its own. This wrapper limits the input,
 * the lookback selected by PromQL or Greptime range syntax, and the rows returned to the alert
 * evaluator. The warehouse client supplies the execution timeout; these checks bound the work
 * requested and the data retained by the caller.
 */
final class AlertQueryBudgetExecutor implements QueryExecutor {

    static final int MAX_QUERY_LENGTH = 8_192;

    static final int MAX_RESULT_ROWS = 1_000;

    private static final BigInteger MAX_RANGE_MILLIS = BigInteger.valueOf(86_400_000L);

    private static final Pattern PROMQL_RANGE = Pattern.compile(
            "\\[\\s*([0-9]+(?:ms|[smhdwy])(?:\\s*[0-9]+(?:ms|[smhdwy]))*)\\s*(?::[^]]*)?]",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern SQL_RANGE = Pattern.compile(
            "\\bRANGE\\s*['\"]\\s*([^'\"]+)\\s*['\"]",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern DURATION_PART = Pattern.compile("([0-9]+)(ms|[smhdwy])",
            Pattern.CASE_INSENSITIVE);

    private final QueryExecutor delegate;

    AlertQueryBudgetExecutor(QueryExecutor delegate) {
        this.delegate = delegate;
    }

    static void validateInput(String query) {
        if (query.length() > MAX_QUERY_LENGTH) {
            throw new AlertExpressionException("Alert query exceeds the 8192 character limit.");
        }
        validateRanges(PROMQL_RANGE.matcher(query));
        validateRanges(SQL_RANGE.matcher(query));
    }

    private static void validateRanges(Matcher ranges) {
        while (ranges.find()) {
            String duration = ranges.group(1).replaceAll("\\s+", "");
            if (durationMillis(duration).compareTo(MAX_RANGE_MILLIS) > 0) {
                throw new AlertExpressionException("Alert query range exceeds the one day limit.");
            }
        }
    }

    private static BigInteger durationMillis(String duration) {
        Matcher parts = DURATION_PART.matcher(duration);
        BigInteger total = BigInteger.ZERO;
        int end = 0;
        while (parts.find()) {
            if (parts.start() != end) {
                return BigInteger.ZERO;
            }
            BigInteger value = new BigInteger(parts.group(1));
            total = total.add(value.multiply(unitMillis(parts.group(2))));
            end = parts.end();
        }
        return end == duration.length() ? total : BigInteger.ZERO;
    }

    private static BigInteger unitMillis(String unit) {
        return switch (unit.toLowerCase(Locale.ROOT)) {
            case "ms" -> BigInteger.ONE;
            case "s" -> BigInteger.valueOf(1_000L);
            case "m" -> BigInteger.valueOf(60_000L);
            case "h" -> BigInteger.valueOf(3_600_000L);
            case "d" -> BigInteger.valueOf(86_400_000L);
            case "w" -> BigInteger.valueOf(604_800_000L);
            case "y" -> BigInteger.valueOf(31_536_000_000L);
            default -> BigInteger.ZERO;
        };
    }

    @Override
    public List<Map<String, Object>> execute(String query) {
        validateInput(query);
        List<Map<String, Object>> rows = delegate.execute(query);
        if (rows != null && rows.size() > MAX_RESULT_ROWS) {
            throw new AlertExpressionException("Alert query returned more than 1000 rows.");
        }
        return rows;
    }

    @Override
    public DatasourceQueryData query(DatasourceQuery datasourceQuery) {
        return delegate.query(datasourceQuery);
    }

    @Override
    public String getDatasource() {
        return delegate.getDatasource();
    }

    @Override
    public boolean support(String queryLanguage) {
        return delegate.support(queryLanguage);
    }
}
