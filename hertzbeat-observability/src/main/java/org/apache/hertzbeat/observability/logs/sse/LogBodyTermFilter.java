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

package org.apache.hertzbeat.observability.logs.sse;

import java.util.function.Predicate;
import org.apache.hertzbeat.common.util.JsonUtil;

/**
 * Literal matching equivalent to GreptimeDB v1.1.4 MatchesTermFinder, not a query language.
 * Boundary algorithm adapted from GreptimeDB (Copyright 2023 Greptime Team), Apache License 2.0.
 * This Java adaptation uses the host JDK's Unicode character tables.
 * Boundary rules: https://github.com/GreptimeTeam/greptimedb/blob/v1.1.4/src/common/function/src/scalars/matches_term.rs
 */
public final class LogBodyTermFilter implements Predicate<Object> {
    private final String term;
    private final boolean caseInsensitive;
    private final boolean han;
    private final boolean unicodeWord;
    private final boolean startsWithOther;
    private final boolean endsWithOther;

    public LogBodyTermFilter(String term) {
        this(term, false);
    }

    public LogBodyTermFilter(String term, boolean caseInsensitive) {
        this.caseInsensitive = caseInsensitive;
        this.term = caseInsensitive && term != null ? term.toLowerCase(java.util.Locale.ROOT) : term;
        this.han = term != null && term.codePoints().anyMatch(LogBodyTermFilter::isHan);
        this.unicodeWord = term != null && term.codePoints().anyMatch(c -> c > 127 && isAlphanumeric(c));
        this.startsWithOther = term != null && !term.isEmpty() && isOther(term.codePointAt(0));
        this.endsWithOther = term != null && !term.isEmpty() && isOther(term.codePointBefore(term.length()));
    }

    @Override
    public boolean test(Object body) {
        if (body == null || term == null) {
            return false;
        }
        // Same representation as GreptimeDbDataStorage.logBodyAsString.
        String text = body instanceof CharSequence ? body.toString() : JsonUtil.toJson(body);
        if (caseInsensitive && text != null) {
            text = text.toLowerCase(java.util.Locale.ROOT);
        }
        if (text == null || term.isEmpty()) {
            return text != null && text.isEmpty();
        }
        for (int from = 0; from <= text.length() - term.length();) {
            int found = text.indexOf(term, from);
            if (found < 0) {
                return false;
            }
            int end = found + term.length();
            boolean left = startsWithOther || found == 0 || boundary(text.codePointBefore(found));
            boolean right = endsWithOther || end == text.length() || boundary(text.codePointAt(end));
            if (han || left && right) {
                return true;
            }
            from = found + Character.charCount(text.codePointAt(found));
        }
        return false;
    }

    private boolean boundary(int point) {
        return unicodeWord ? !isAlphanumeric(point) && !isHan(point) : !isAsciiWord(point);
    }

    private static boolean isOther(int point) {
        return !isAlphanumeric(point) && !isHan(point);
    }

    private static boolean isHan(int point) {
        return Character.UnicodeScript.of(point) == Character.UnicodeScript.HAN;
    }

    private static boolean isAsciiWord(int point) {
        return point >= 'a' && point <= 'z' || point >= 'A' && point <= 'Z' || point >= '0' && point <= '9';
    }

    private static boolean isAlphanumeric(int point) {
        int type = Character.getType(point);
        return Character.isAlphabetic(point) || type == Character.DECIMAL_DIGIT_NUMBER
                || type == Character.LETTER_NUMBER || type == Character.OTHER_NUMBER;
    }
}
