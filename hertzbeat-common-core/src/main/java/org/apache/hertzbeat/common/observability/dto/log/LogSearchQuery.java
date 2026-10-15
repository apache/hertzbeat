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

package org.apache.hertzbeat.common.observability.dto.log;

import java.util.Objects;

/** Authorized outer scope and independent user Boolean predicate. */
public record LogSearchQuery(LogFacets.Scope scope, LogSearchExpression expression, LogGroupSelection selection) {
    public LogSearchQuery(LogFacets.Scope scope, LogSearchExpression expression) {
        this(scope, expression, null);
    }

    public LogSearchQuery {
        Objects.requireNonNull(scope);
        Objects.requireNonNull(expression);
        if (scope.search() != null && selection == null
                && (scope.numericRange() == null || !(expression instanceof LogSearchExpression.And and && and.children().isEmpty()))) {
            throw new IllegalArgumentException(
                    "Structured scope cannot contain legacy body search");
        }
    }
}
