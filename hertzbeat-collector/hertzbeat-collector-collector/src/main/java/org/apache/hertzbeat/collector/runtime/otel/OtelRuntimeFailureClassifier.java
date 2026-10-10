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

package org.apache.hertzbeat.collector.runtime.otel;

import java.util.Locale;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.FailureCode;

/** Maps runtime diagnostics to bounded wire-level categories without returning their content. */
public class OtelRuntimeFailureClassifier {

    public FailureCode classify(String diagnostic) {
        if (diagnostic == null || diagnostic.isBlank()) {
            return FailureCode.NONE;
        }
        String value = diagnostic.toLowerCase(Locale.ROOT);
        if (containsAny(value, "no space left on device", "disk quota exceeded",
                "database reached maximum size", "database or disk is full",
                "storage extension has run out of available space")) {
            return FailureCode.STORAGE_FULL;
        }
        if (containsAny(value, "checksum error", "invalid database", "database corruption detected",
                "corrupted database")) {
            return FailureCode.STORAGE_CORRUPTED;
        }
        if (containsAny(value, "queue is full", "failed to enqueue", "queue capacity reached")) {
            return FailureCode.QUEUE_FULL;
        }
        if (containsAny(value, "address already in use", "bind: address", "failed to bind")) {
            return FailureCode.PORT_CONFLICT;
        }
        if (containsAny(value, "unauthenticated", "unauthorized", "http 401", "http 403", "status code 401",
                "status code 403")) {
            return FailureCode.AUTHENTICATION_FAILED;
        }
        if (containsAny(value, "connection refused", "connection reset", "no such host", "deadline exceeded",
                "backend unavailable", "transport is closing", "status code 429", "status code 503")) {
            return FailureCode.BACKEND_UNAVAILABLE;
        }
        if (containsAny(value, "exited unexpectedly", "runtime crashed", "signal: killed")) {
            return FailureCode.PROCESS_CRASH;
        }
        if (containsAny(value, "configuration error", "configuration validation", "invalid configuration",
                "cannot unmarshal", "validation failed", "validation timed out", "failed readiness",
                "requires an intake token", "requires a collector identity")) {
            return FailureCode.CONFIGURATION_ERROR;
        }
        return FailureCode.UNKNOWN;
    }

    private boolean containsAny(String value, String... candidates) {
        for (String candidate : candidates) {
            if (value.contains(candidate)) {
                return true;
            }
        }
        return false;
    }
}
