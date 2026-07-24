/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.instrumentation.v2.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Map;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.SourceKind;

/** Safe version 2 detection wire contract. */
public final class InstrumentationDetectionV2 {

    private InstrumentationDetectionV2() {
    }

    /** Exact detection lifecycle states. */
    public enum DetectionStatus {
        WAITING("waiting"),
        RECEIVED("received"),
        UNSUPPORTED("unsupported"),
        UNAVAILABLE("unavailable"),
        ERROR("error");

        private final String code;

        DetectionStatus(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** One bounded onboarding detection request. */
    public record DetectionRequest(
            int schemaVersion,
            SourceKind sourceKind,
            String recipeId,
            Language language,
            Framework framework,
            Method method,
            Environment environment,
            Platform platform,
            ServiceIdentity service,
            String intakeProfileId,
            long startedAt) {
    }

    /** Safe echo of the complete storage query scope. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DetectionContext(
            SourceKind sourceKind,
            String recipeId,
            Language language,
            Framework framework,
            Method method,
            Environment environment,
            Platform platform,
            ServiceIdentity service,
            String intakeProfileId,
            String collectorId,
            long startedAt,
            long windowEndAt) {
    }

    /** One signal's result. */
    public record SignalDetection(DetectionStatus status, Long lastReceivedAt, DetectionErrorCode errorCode) {
        public SignalDetection {
            if (status == null || lastReceivedAt != null && lastReceivedAt <= 0) {
                throw new IllegalArgumentException("Instrumentation v2 signal detection is invalid");
            }
            switch (status) {
                case RECEIVED -> {
                    if (lastReceivedAt == null || errorCode != null) {
                        throw new IllegalArgumentException("Received detection is invalid");
                    }
                }
                case WAITING -> requireEmpty(lastReceivedAt, errorCode, DetectionErrorCode.SIGNAL_NOT_RECEIVED);
                case UNSUPPORTED -> requireEmpty(lastReceivedAt, errorCode, DetectionErrorCode.SIGNAL_NOT_SUPPORTED);
                case UNAVAILABLE -> {
                    if (lastReceivedAt != null || errorCode == null) {
                        throw new IllegalArgumentException("Unavailable detection is invalid");
                    }
                }
                case ERROR -> {
                    if (errorCode == null) {
                        throw new IllegalArgumentException("Error detection is invalid");
                    }
                }
                default -> throw new IllegalArgumentException("Detection status is invalid");
            }
        }

        private static void requireEmpty(
                Long timestamp, DetectionErrorCode actual, DetectionErrorCode expected) {
            if (timestamp != null || actual != expected) {
                throw new IllegalArgumentException("Terminal detection is invalid");
            }
        }
    }

    /** Complete fixed-signal detection result. */
    public record DetectionResponse(
            int schemaVersion,
            long detectedAt,
            DetectionContext context,
            Map<Signal, SignalDetection> signals) {
        public DetectionResponse {
            signals = Map.copyOf(signals);
        }
    }
}
