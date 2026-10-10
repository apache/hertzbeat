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

package org.apache.hertzbeat.common.observability.dto.log;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/** One bounded set filter whose child inherits only the trusted hard scope. */
public final class LogSubquery {
    private LogSubquery() { }

    /** Child projection and its independent authored search. */
    public record Child(String field, String searchSyntax, String search) { }

    /** Explicitly supported ranking measure. */
    public record Measure(String function, @JsonInclude(JsonInclude.Include.NON_NULL) String field) { }

    /** Bounded child rank. */
    public record Rank(String direction, int limit, Measure measure) { }

    /** Persistable filter descriptor without trusted scope. */
    public record Descriptor(int version, String mainField, String operator, Child child, Rank rank) { }

    /** Parsed child predicate used only during execution. */
    public record Filter(Descriptor descriptor, LogSearchExpression childSearch) { }

    /** Accepted request echoed with the effective operation. */
    public record Executed(Map<String, String> parameters, Descriptor subquery, Map<String, Object> operation) { }

    /** Subquery result with one of the shared terminal result shapes. */
    public record Result(int version, LogFacets.Window window, Executed executed, Map<String, Object> result) { }
}
