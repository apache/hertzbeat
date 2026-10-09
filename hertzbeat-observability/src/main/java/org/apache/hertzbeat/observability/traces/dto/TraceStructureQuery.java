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

package org.apache.hertzbeat.observability.traces.dto;

/** Two named span predicates evaluated against observed members of the same trace. */
public record TraceStructureQuery(long start, long end, Clause left, Clause right, Relation relation,
                                  int pageIndex, int pageSize) {
    public TraceStructureQuery {
        if (start <= 0 || end <= start || end > Long.MAX_VALUE / 1_000_000L
                || end - start > 86_400_000L || left == null || right == null
                || relation == null || pageIndex < 0 || pageSize < 1 || pageSize > 100) {
            throw new IllegalArgumentException("Invalid structural trace query");
        }
    }

    /** Positive relations between observed spans in one trace. */
    public enum Relation { BOTH, EITHER, DIRECT, UPSTREAM }

    /** One exact service, operation or status condition. */
    public record Clause(String serviceName, String operationName, String status) {
        public Clause {
            if (serviceName == null && operationName == null && status == null
                    || !validText(serviceName) || !validText(operationName)
                    || status != null && !java.util.List.of("ERROR", "OK", "UNSET").contains(status)) {
                throw new IllegalArgumentException("Invalid structural span clause");
            }
        }

        private static boolean validText(String value) {
            return value == null || !value.isBlank() && value.length() <= 128
                    && value.chars().noneMatch(Character::isISOControl);
        }
    }
}
