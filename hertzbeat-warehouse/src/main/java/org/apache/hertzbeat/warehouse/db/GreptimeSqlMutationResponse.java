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

package org.apache.hertzbeat.warehouse.db;

import java.math.BigInteger;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** A mutation acknowledgement is different from a SELECT records envelope. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GreptimeSqlMutationResponse(Object code, Object error, List<Output> output) {

    /** Exactly one affected-row acknowledgement is permitted for a single mutation. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Output(Object affectedrows, Object records, Object error) { }

    public long affectedRows() {
        if (error != null || (code != null && integralValue(code) != 0)) {
            throw new IllegalStateException("GreptimeDB SQL mutation returned an error");
        }
        if (output == null || output.size() != 1) {
            throw new IllegalStateException("GreptimeDB SQL mutation returned an invalid output count");
        }
        Output acknowledgement = output.getFirst();
        if (acknowledgement == null || acknowledgement.records() != null || acknowledgement.error() != null) {
            throw new IllegalStateException("GreptimeDB SQL mutation returned malformed output");
        }
        return integralValue(acknowledgement.affectedrows());
    }

    private static long integralValue(Object value) {
        if (value instanceof BigInteger integer) {
            try {
                long count = integer.longValueExact();
                if (count >= 0) { return count; }
            } catch (ArithmeticException overflow) {
                throw new IllegalStateException("GreptimeDB SQL mutation count overflow", overflow);
            }
        } else if (value instanceof Byte || value instanceof Short || value instanceof Integer || value instanceof Long) {
            long count = ((Number) value).longValue();
            if (count >= 0) { return count; }
        }
        throw new IllegalStateException("GreptimeDB SQL mutation requires a nonnegative integral affectedrows");
    }
}
