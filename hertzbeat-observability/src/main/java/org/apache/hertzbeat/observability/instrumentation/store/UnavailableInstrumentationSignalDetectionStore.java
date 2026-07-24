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
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.springframework.stereotype.Component;

/**
 * Honest fallback used until a production signal storage adapter is configured.
 */
@Component
public class UnavailableInstrumentationSignalDetectionStore implements InstrumentationSignalDetectionStore {

    @Override
    public DetectionSnapshot detect(DetectionCriteria criteria) {
        EnumMap<Signal, SignalObservation> observations = new EnumMap<>(Signal.class);
        for (Signal signal : Signal.values()) {
            observations.put(signal, SignalObservation.unavailable(DetectionErrorCode.STORAGE_UNAVAILABLE));
        }
        return new DetectionSnapshot(observations);
    }
}
