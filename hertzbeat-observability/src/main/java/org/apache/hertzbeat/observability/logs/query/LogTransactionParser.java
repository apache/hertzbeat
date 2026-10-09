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

package org.apache.hertzbeat.observability.logs.query;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression;
import org.apache.hertzbeat.common.observability.dto.log.LogTransactions;

/** Narrow HTTP controls; identity text never becomes a search expression. */
public final class LogTransactionParser {
    private LogTransactionParser() { }

    public static LogTransactions.Request request(Map<String, String> values) {
        return new LogTransactions.Request(number(values, "transactionVersion", 1),
                LogFacets.Field.parse(values.get("transactionField")), number(values, "transactionLimit", 20),
                values.getOrDefault("transactionOrder", "related-count-desc"));
    }

    public static LogTransactions.Detail detail(Map<String, String> values) {
        String syntax = values.get("localSearchSyntax");
        String search = values.get("localSearch");
        LogSearchParser.validateQuery(syntax, search);
        boolean structured = LogSearchParser.SYNTAX.equals(syntax);
        int page = number(values, "pageIndex", 0);
        int size = number(values, "pageSize", 20);
        if (size < 1 || size > 100) { throw new IllegalArgumentException("Invalid transaction page size"); }
        long position = (long) page * size;
        if (position + size > Integer.MAX_VALUE) { throw new IllegalArgumentException("Invalid transaction page offset"); }
        int offset = (int) position;
        return new LogTransactions.Detail(values.get("transactionId"), structured ? null : search,
                structured ? LogSearchParser.parse(search) : new LogSearchExpression.And(List.of()), offset, size,
                values.getOrDefault("sort", "oldest"));
    }

    private static int number(Map<String, String> values, String key, int fallback) {
        if (!values.containsKey(key)) { return fallback; }
        String value = values.get(key);
        if (value == null || !value.matches("0|[1-9][0-9]{0,9}")) { throw new IllegalArgumentException("Invalid transaction number"); }
        return Integer.parseInt(value);
    }
}
