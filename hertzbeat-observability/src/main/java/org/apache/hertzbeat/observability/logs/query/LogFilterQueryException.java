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

/** Stable public failure for malformed or unsupported log predicates. */
public class LogFilterQueryException extends IllegalArgumentException {
    public static final String ERROR_CODE = "observability_log_filter_invalid";

    private final Reason reason;
    private final String source;
    private final Detail diagnostic;

    /** Recognized query features that this search contract cannot execute. */
    public enum Reason {
        FULL_TEXT_UNSUPPORTED,
        CIDR_UNSUPPORTED,
        NESTED_PATH_UNSUPPORTED,
        GROUP_SELECTION_UNSUPPORTED,
        CALCULATED_EXTRACTION_UNAVAILABLE,
        CALCULATED_BUDGET_EXCEEDED,
        CALCULATED_INVALID_PATTERN
    }

    /** Additive error detail without rejected query text. */
    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    public record Detail(String reason, String source, String syntaxIssue, Integer start, Integer end) {
        public Detail(String reason, String source) { this(reason, source, null, null, null); }
    }

    public LogFilterQueryException() {
        this(null);
    }

    public LogFilterQueryException(Reason reason) {
        this(reason, null, null);
    }

    private LogFilterQueryException(Reason reason, String source, Detail diagnostic) {
        super(ERROR_CODE);
        this.reason = reason;
        this.source = source;
        this.diagnostic = diagnostic;
    }

    /** Identify a comparison source without including its expression. */
    public LogFilterQueryException withSource(String source) {
        if (!"a".equals(source) && !"b".equals(source)) { throw new IllegalArgumentException("Invalid comparison source"); }
        return new LogFilterQueryException(reason, source, diagnostic);
    }

    static LogFilterQueryException syntax(String issue, int start, int end) {
        return new LogFilterQueryException(null, null, new Detail(null, null, issue, start, end));
    }

    public Detail detail() {
        if (diagnostic != null) {
            return new Detail(null, source, diagnostic.syntaxIssue(), diagnostic.start(), diagnostic.end());
        }
        return reason == null && source == null ? null : new Detail(reason == null ? null : reason.name().toLowerCase(java.util.Locale.ROOT), source);
    }
}
