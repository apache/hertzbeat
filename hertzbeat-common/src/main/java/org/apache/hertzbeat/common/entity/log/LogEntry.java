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

package org.apache.hertzbeat.common.entity.log;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * OpenTelemetry Log Entry entity based on OpenTelemetry log data model specification.
 * 
 * @see <a href="https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md">OpenTelemetry Log Data Model</a>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogEntry {

    /**
     * Time when the event occurred.
     * Value is UNIX Epoch time in nanoseconds since 00:00:00 UTC on 1 January 1970.
     */
    private Long timeUnixNano;

    /**
     * Time when the event was observed.
     * Value is UNIX Epoch time in nanoseconds since 00:00:00 UTC on 1 January 1970.
     */
    private Long observedTimeUnixNano;

    /**
     * Numerical value of the severity.
     * Smaller numerical values correspond to less severe events (such as debug events),
     * larger numerical values correspond to more severe events (such as errors and critical events).
     */
    private Integer severityNumber;

    /**
     * The severity text (also known as log level).
     * This is the original string representation of the severity as it is known at the source.
     */
    private String severityText;

    /**
     * A value containing the body of the log record.
     * Can be for example a human-readable string message (including multi-line)
     * or it can be a structured data composed of arrays and maps of other values.
     */
    private Object body;

    /**
     * Additional information about the specific event occurrence.
     * Unlike the Resource field, these are NOT fixed for the lifetime of the process.
     */
    private Map<String, Object> attributes;

    /**
     * Dropped attributes count.
     * Number of attributes that were discarded due to limits being exceeded.
     */
    private Integer droppedAttributesCount;

    /**
     * A unique identifier for a trace.
     * All spans from the same trace share the same trace_id.
     * The ID is a 16-byte array represented as a hex string.
     */
    private String traceId;

    /**
     * A unique identifier for a span within a trace.
     * The ID is an 8-byte array represented as a hex string.
     */
    private String spanId;

    /**
     * Trace flag as defined in W3C Trace Context specification.
     * At the time of writing the specification defines one flag - the SAMPLED flag.
     */
    private Integer traceFlags;

    /**
     * Resource information.
     * Information about the entity producing the telemetry.
     */
    private Map<String, Object> resource;

    /**
     * Instrumentation Scope information.
     * Information about the instrumentation scope that emitted the log.
     */
    private InstrumentationScope instrumentationScope;

    /**
     * Instrumentation Scope information for logs.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstrumentationScope {
        
        /**
         * The name of the instrumentation scope.
         * This should be the fully-qualified name of the instrumentation library.
         */
        private String name;

        /**
         * The version of the instrumentation scope.
         */
        private String version;

        /**
         * Additional attributes that describe the scope.
         */
        private Map<String, Object> attributes;

        /**
         * Number of attributes that were discarded due to limits being exceeded.
         */
        private Integer droppedAttributesCount;
    }
}
