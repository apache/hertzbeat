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

package org.apache.hertzbeat.observability.instrumentation.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionStatus;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Environment;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Framework;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Language;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Method;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Platform;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.PollingDecision;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.ServiceIdentity;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.Signal;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.SignalDetection;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationCollectorReadinessStore.CollectorReadiness;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionCriteria;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.DetectionSnapshot;
import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore.SignalObservation;
import org.junit.jupiter.api.Test;

class InstrumentationDetectionServiceTest {

    private static final long STARTED_AT = 1_710_000_000_000L;
    private static final long DETECTED_AT = STARTED_AT + 5_000;

    @Test
    void scopesDetectionToTheExactOnboardingContextAndKeepsSignalsDistinct() {
        AtomicReference<DetectionCriteria> observedCriteria = new AtomicReference<>();
        InstrumentationSignalDetectionStore store = criteria -> {
            observedCriteria.set(criteria);
            EnumMap<Signal, SignalObservation> observations = new EnumMap<>(Signal.class);
            observations.put(Signal.METRICS, SignalObservation.received(STARTED_AT + 1_000));
            observations.put(Signal.LOGS, SignalObservation.waiting());
            observations.put(Signal.TRACES, SignalObservation.error(
                    DetectionErrorCode.STORAGE_QUERY_FAILED, STARTED_AT + 2_000));
            return new DetectionSnapshot(observations);
        };
        InstrumentationDetectionService service = new InstrumentationDetectionService(
                new InstrumentationCatalogService(), store, () -> DETECTED_AT);

        var response = service.detect(scopedJavaRequest());

        assertEquals(new DetectionCriteria(
                "checkout-api", "commerce", "prod", "collector-east",
                "checkout-7d9", "/checkout/{id}", STARTED_AT, DETECTED_AT), observedCriteria.get());
        assertEquals(DetectionStatus.RECEIVED, response.signals().metrics().status());
        assertEquals(STARTED_AT + 1_000, response.signals().metrics().lastReceivedAt());
        assertEquals(DetectionStatus.WAITING, response.signals().logs().status());
        assertEquals(DetectionErrorCode.SIGNAL_NOT_RECEIVED, response.signals().logs().errorCode());
        assertEquals(DetectionStatus.ERROR, response.signals().traces().status());
        assertEquals(DetectionErrorCode.STORAGE_QUERY_FAILED, response.signals().traces().errorCode());
        assertEquals("checkout-api", response.queryJumpContext().serviceName());
        assertEquals("collector-east", response.queryJumpContext().collectorId());
        assertEquals("checkout-7d9", response.queryJumpContext().serviceInstanceId());
        assertEquals("/checkout/{id}", response.queryJumpContext().endpoint());
        assertEquals(STARTED_AT, response.queryJumpContext().startedAt());
        assertEquals(DETECTED_AT, response.queryJumpContext().detectedAt());
        assertEquals(response.queryJumpContext(), response.queryJumps().get(0).context());
        assertEquals(response.queryJumpContext(), response.queryJumps().get(1).context());
        assertEquals(response.queryJumpContext(), response.queryJumps().get(2).context());
        assertEquals(PollingDecision.MANUAL_RETRY, response.polling().decision());
        assertNull(response.polling().pollAfterMs());
        assertEquals(STARTED_AT + 120_000, response.polling().deadlineAt());
        assertEquals(Signal.METRICS, response.queryJumps().get(0).signal());
        assertEquals(true, response.queryJumps().get(0).enabled());
    }

    @Test
    void preventsStorageFromOverridingUnsupportedCatalogSignals() {
        InstrumentationSignalDetectionStore store = criteria -> new DetectionSnapshot(java.util.Map.of(
                Signal.METRICS, SignalObservation.received(STARTED_AT + 1_000),
                Signal.LOGS, SignalObservation.received(STARTED_AT + 1_000),
                Signal.TRACES, SignalObservation.unavailable(DetectionErrorCode.STORAGE_UNAVAILABLE)));
        InstrumentationDetectionService service =
                new InstrumentationDetectionService(new InstrumentationCatalogService(), store);

        DetectionRequest request = new DetectionRequest(
                1,
                Language.GO,
                Framework.GO_GENERIC,
                Method.EBPF,
                Environment.VM,
                Platform.LINUX_AMD64,
                new ServiceIdentity("checkout-api", "commerce", "prod"),
                "collector-east",
                STARTED_AT);
        var response = service.detect(request);

        assertEquals(DetectionStatus.UNSUPPORTED, response.signals().metrics().status());
        assertEquals(DetectionStatus.UNSUPPORTED, response.signals().logs().status());
        assertEquals(DetectionStatus.UNAVAILABLE, response.signals().traces().status());
        assertEquals(DetectionErrorCode.STORAGE_UNAVAILABLE, response.signals().traces().errorCode());
        assertEquals(PollingDecision.MANUAL_RETRY, response.polling().decision());
    }

    @Test
    void continuesPollingMixedTerminalAndWaitingSignalsBeforeDeadline() {
        InstrumentationSignalDetectionStore store = criteria -> new DetectionSnapshot(java.util.Map.of(
                Signal.METRICS, SignalObservation.received(STARTED_AT + 1_000),
                Signal.LOGS, SignalObservation.waiting(),
                Signal.TRACES, SignalObservation.received(STARTED_AT + 2_000)));
        InstrumentationDetectionService service = new InstrumentationDetectionService(
                new InstrumentationCatalogService(), store, () -> STARTED_AT + 5_000);

        var response = service.detect(javaRequest());

        assertEquals(PollingDecision.CONTINUE_POLLING, response.polling().decision());
        assertEquals(3_000L, response.polling().pollAfterMs());
        assertEquals(STARTED_AT + 120_000, response.polling().deadlineAt());
        assertEquals(true, response.queryJumps().get(0).enabled());
        assertEquals(false, response.queryJumps().get(1).enabled());
        assertEquals(true, response.queryJumps().get(2).enabled());
    }

    @Test
    void completesWhenEverySignalIsReceivedOrUnsupported() {
        InstrumentationSignalDetectionStore store = criteria -> new DetectionSnapshot(java.util.Map.of(
                Signal.METRICS, SignalObservation.received(STARTED_AT + 1_000),
                Signal.LOGS, SignalObservation.received(STARTED_AT + 1_500),
                Signal.TRACES, SignalObservation.received(STARTED_AT + 2_000)));
        InstrumentationDetectionService service = new InstrumentationDetectionService(
                new InstrumentationCatalogService(), store, () -> STARTED_AT + 5_000);

        var response = service.detect(nodeRequest());

        assertEquals(PollingDecision.COMPLETE, response.polling().decision());
        assertNull(response.polling().pollAfterMs());
        assertEquals(DetectionStatus.UNSUPPORTED, response.signals().logs().status());
        assertEquals(false, response.queryJumps().get(1).enabled());
    }

    @Test
    void stopsAutomaticPollingWhenWaitingReachesDeadline() {
        InstrumentationSignalDetectionStore store = criteria -> new DetectionSnapshot(java.util.Map.of(
                Signal.METRICS, SignalObservation.waiting(),
                Signal.LOGS, SignalObservation.waiting(),
                Signal.TRACES, SignalObservation.waiting()));
        InstrumentationDetectionService service = new InstrumentationDetectionService(
                new InstrumentationCatalogService(), store, () -> STARTED_AT + 120_000);

        var response = service.detect(javaRequest());

        assertEquals(PollingDecision.MANUAL_RETRY, response.polling().decision());
        assertNull(response.polling().pollAfterMs());
    }

    @Test
    void reportsFreshCollectorUnavailabilityOnlyForSignalsStillWaiting() {
        InstrumentationSignalDetectionStore store = criteria -> new DetectionSnapshot(java.util.Map.of(
                Signal.METRICS, SignalObservation.received(STARTED_AT + 1_000),
                Signal.LOGS, SignalObservation.waiting(),
                Signal.TRACES, SignalObservation.received(STARTED_AT - 1)));
        InstrumentationCollectorReadinessStore readinessStore =
                collectorId -> CollectorReadiness.unavailable();
        InstrumentationDetectionService service = new InstrumentationDetectionService(
                new InstrumentationCatalogService(), store, readinessStore, () -> STARTED_AT + 5_000);

        var response = service.detect(javaRequest());

        assertEquals(DetectionStatus.RECEIVED, response.signals().metrics().status());
        assertEquals(DetectionStatus.UNAVAILABLE, response.signals().logs().status());
        assertEquals(DetectionErrorCode.COLLECTOR_UNAVAILABLE, response.signals().logs().errorCode());
        assertEquals(DetectionStatus.UNAVAILABLE, response.signals().traces().status());
        assertEquals(DetectionErrorCode.COLLECTOR_UNAVAILABLE, response.signals().traces().errorCode());
        assertEquals(PollingDecision.MANUAL_RETRY, response.polling().decision());
    }

    @Test
    void reportsAuthenticationFailureWithoutOverridingReceivedOrUnsupportedSignals() {
        InstrumentationSignalDetectionStore store = criteria -> new DetectionSnapshot(java.util.Map.of(
                Signal.METRICS, SignalObservation.received(STARTED_AT + 1_000),
                Signal.LOGS, SignalObservation.waiting(),
                Signal.TRACES, SignalObservation.waiting()));
        InstrumentationCollectorReadinessStore readinessStore =
                collectorId -> CollectorReadiness.authenticationFailed();
        InstrumentationDetectionService service = new InstrumentationDetectionService(
                new InstrumentationCatalogService(), store, readinessStore, () -> STARTED_AT + 5_000);

        var response = service.detect(nodeRequest());

        assertEquals(DetectionStatus.RECEIVED, response.signals().metrics().status());
        assertEquals(DetectionStatus.UNSUPPORTED, response.signals().logs().status());
        assertEquals(DetectionErrorCode.SIGNAL_NOT_SUPPORTED, response.signals().logs().errorCode());
        assertEquals(DetectionStatus.ERROR, response.signals().traces().status());
        assertEquals(DetectionErrorCode.AUTHENTICATION_FAILED, response.signals().traces().errorCode());
    }

    @Test
    void keepsStorageDetectionAuthoritativeWhenReadinessIsUnknownOrFails() {
        InstrumentationSignalDetectionStore store = criteria -> new DetectionSnapshot(java.util.Map.of(
                Signal.METRICS, SignalObservation.waiting(),
                Signal.LOGS, SignalObservation.unavailable(DetectionErrorCode.STORAGE_UNAVAILABLE),
                Signal.TRACES, SignalObservation.error(DetectionErrorCode.STORAGE_QUERY_FAILED, null)));
        InstrumentationCollectorReadinessStore readinessStore = collectorId -> {
            throw new IllegalStateException("readiness unavailable");
        };
        InstrumentationDetectionService service = new InstrumentationDetectionService(
                new InstrumentationCatalogService(), store, readinessStore, () -> STARTED_AT + 5_000);

        var response = service.detect(javaRequest());

        assertEquals(DetectionStatus.WAITING, response.signals().metrics().status());
        assertEquals(DetectionErrorCode.SIGNAL_NOT_RECEIVED, response.signals().metrics().errorCode());
        assertEquals(DetectionStatus.UNAVAILABLE, response.signals().logs().status());
        assertEquals(DetectionErrorCode.STORAGE_UNAVAILABLE, response.signals().logs().errorCode());
        assertEquals(DetectionStatus.ERROR, response.signals().traces().status());
        assertEquals(DetectionErrorCode.STORAGE_QUERY_FAILED, response.signals().traces().errorCode());
    }

    @Test
    void enforcesSignalDetectionStateInvariants() {
        assertThrows(IllegalArgumentException.class, () -> new SignalDetection(DetectionStatus.RECEIVED, null, null));
        assertThrows(IllegalArgumentException.class, () -> new SignalDetection(
                DetectionStatus.WAITING, STARTED_AT, DetectionErrorCode.SIGNAL_NOT_RECEIVED));
        assertThrows(IllegalArgumentException.class, () -> new SignalDetection(
                DetectionStatus.UNSUPPORTED, null, DetectionErrorCode.STORAGE_UNAVAILABLE));
        assertThrows(IllegalArgumentException.class, () -> new SignalDetection(
                DetectionStatus.UNAVAILABLE, null, null));
        assertThrows(IllegalArgumentException.class, () -> new SignalDetection(
                DetectionStatus.ERROR, null, null));
    }

    @Test
    void documentedDetectionExampleMatchesWireSerialization() throws IOException {
        List<String> examples = documentedJsonBlocks("## Detection request and response example");
        ObjectMapper mapper = new ObjectMapper();
        DetectionRequest documentedRequest = mapper.readValue(examples.get(0), DetectionRequest.class);
        InstrumentationSignalDetectionStore store = criteria -> new DetectionSnapshot(java.util.Map.of(
                Signal.METRICS, SignalObservation.received(1_710_000_004_200L),
                Signal.LOGS, SignalObservation.waiting(),
                Signal.TRACES, SignalObservation.received(1_710_000_004_500L)));
        InstrumentationDetectionService service = new InstrumentationDetectionService(
                new InstrumentationCatalogService(), store, () -> 1_710_000_005_000L);

        DetectionResponse documentedResponse = mapper.readValue(examples.get(1), DetectionResponse.class);
        assertEquals(documentedResponse, service.detect(documentedRequest));
    }

    private DetectionRequest javaRequest() {
        return new DetectionRequest(
                1,
                Language.JAVA,
                Framework.SPRING_BOOT,
                Method.ZERO_CODE,
                Environment.DOCKER,
                Platform.LINUX_AMD64,
                new ServiceIdentity("checkout-api", "commerce", "prod"),
                "collector-east",
                STARTED_AT);
    }

    private DetectionRequest scopedJavaRequest() {
        return new DetectionRequest(
                1,
                Language.JAVA,
                Framework.SPRING_BOOT,
                Method.ZERO_CODE,
                Environment.DOCKER,
                Platform.LINUX_AMD64,
                new ServiceIdentity(
                        "checkout-api", "commerce", "prod", " checkout-7d9 ", " /checkout/{id} "),
                "collector-east",
                STARTED_AT);
    }

    private DetectionRequest nodeRequest() {
        return new DetectionRequest(
                1,
                Language.NODEJS,
                Framework.EXPRESS,
                Method.ZERO_CODE,
                Environment.DOCKER,
                Platform.LINUX_AMD64,
                new ServiceIdentity("checkout-api", "commerce", "prod"),
                "collector-east",
                STARTED_AT);
    }

    private List<String> documentedJsonBlocks(String heading) throws IOException {
        String document = Files.readString(findRepositoryFile("docs/instrumentation-api-v1.md"));
        String section = document.substring(document.indexOf(heading));
        List<String> blocks = new ArrayList<>();
        int cursor = 0;
        while ((cursor = section.indexOf("```json", cursor)) >= 0) {
            int jsonStart = cursor + "```json".length();
            int jsonEnd = section.indexOf("```", jsonStart);
            blocks.add(section.substring(jsonStart, jsonEnd));
            cursor = jsonEnd + "```".length();
        }
        assertEquals(2, blocks.size());
        return blocks;
    }

    private Path findRepositoryFile(String relativePath) {
        Path directory = Path.of("").toAbsolutePath();
        while (directory != null) {
            Path candidate = directory.resolve(relativePath);
            if (Files.isRegularFile(candidate)) {
                return candidate;
            }
            directory = directory.getParent();
        }
        throw new IllegalStateException("Repository file not found: " + relativePath);
    }
}
