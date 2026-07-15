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

package org.apache.hertzbeat.observability.instrumentation.store;

import java.util.EnumMap;
import java.util.Map;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;

/**
 * Storage-neutral port for scoped signal reception detection.
 *
 * <p>Implementations must apply every criterion. A global signal count is not valid evidence for
 * an onboarding attempt. The version 1 contract ships this port and an explicit unavailable
 * fallback; a real Greptime adapter is required before production detection can report received.</p>
 */
@FunctionalInterface
public interface InstrumentationSignalDetectionStore {

    DetectionSnapshot detect(DetectionCriteria criteria);

    /** Complete non-secret identity and time boundary for one onboarding attempt. */
    record DetectionCriteria(
            String serviceName,
            String serviceNamespace,
            String environment,
            String collectorId,
            long startedAt) {
    }

    /** Per-signal observations returned from a storage adapter. */
    record DetectionSnapshot(Map<Signal, SignalObservation> observations) {
        public DetectionSnapshot {
            EnumMap<Signal, SignalObservation> copy = new EnumMap<>(Signal.class);
            if (observations != null) {
                copy.putAll(observations);
            }
            observations = Map.copyOf(copy);
        }

        public SignalObservation observation(Signal signal) {
            return observations.get(signal);
        }
    }

    /** One adapter observation. */
    record SignalObservation(
            DetectionStatus status,
            Long lastReceivedAt,
            DetectionErrorCode errorCode) {

        public SignalObservation {
            if (status != DetectionStatus.WAITING
                    && status != DetectionStatus.RECEIVED
                    && status != DetectionStatus.UNAVAILABLE
                    && status != DetectionStatus.ERROR) {
                throw new IllegalArgumentException("Storage observation has an unsupported status");
            }
        }

        public static SignalObservation waiting() {
            return new SignalObservation(
                    DetectionStatus.WAITING, null, DetectionErrorCode.SIGNAL_NOT_RECEIVED);
        }

        public static SignalObservation received(long lastReceivedAt) {
            return new SignalObservation(DetectionStatus.RECEIVED, lastReceivedAt, null);
        }

        public static SignalObservation unavailable(DetectionErrorCode errorCode) {
            return new SignalObservation(DetectionStatus.UNAVAILABLE, null, errorCode);
        }

        public static SignalObservation error(DetectionErrorCode errorCode, Long lastReceivedAt) {
            return new SignalObservation(DetectionStatus.ERROR, lastReceivedAt, errorCode);
        }
    }
}
