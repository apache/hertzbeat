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

package org.apache.hertzbeat.warehouse.store.history.tsdb.vm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.timer.TimerTask;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

/**
 * Test case for {@link VictoriaMetricsClusterDataStorage}.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VictoriaMetricsClusterDataStorageTest {

    @Mock
    private RestTemplate restTemplate;

    @Test
    void flushesDataAddedWhileAnImmediateFlushIsRunning() throws Exception {
        mockHealthCheck();
        CountDownLatch firstWriteStarted = new CountDownLatch(1);
        CountDownLatch releaseFirstWrite = new CountDownLatch(1);
        List<String> successfulBodies = new CopyOnWriteArrayList<>();
        AtomicInteger writes = new AtomicInteger();
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenAnswer(invocation -> {
                    HttpEntity<String> request = invocation.getArgument(1);
                    if (writes.getAndIncrement() == 0) {
                        firstWriteStarted.countDown();
                        assertThat(releaseFirstWrite.await(5, TimeUnit.SECONDS)).isTrue();
                    }
                    successfulBodies.add(request.getBody());
                    return ResponseEntity.noContent().build();
                });
        VictoriaMetricsClusterDataStorage storage = createStorage(2, 3600);

        try {
            // Allow the constructor's initial empty periodic run to settle.
            Thread.sleep(1200);
            saveOneMetric(storage);
            saveOneMetric(storage);
            assertThat(firstWriteStarted.await(5, TimeUnit.SECONDS)).isTrue();

            saveOneMetric(storage);
            saveOneMetric(storage);
            releaseFirstWrite.countDown();

            await().atMost(5, TimeUnit.SECONDS)
                    .untilAsserted(() -> assertThat(successfulBodies).hasSize(2));
            assertThat(successfulBodies.stream().mapToLong(VictoriaMetricsClusterDataStorageTest::lineCount).sum())
                    .isEqualTo(4);
        } finally {
            releaseFirstWrite.countDown();
            storage.destroy();
        }
    }

    @Test
    void retriesPeriodicFlushFailuresQuicklyWhenTheConfiguredIntervalIsLong() throws Exception {
        mockHealthCheck();
        List<String> attemptedBodies = new CopyOnWriteArrayList<>();
        AtomicInteger writes = new AtomicInteger();
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenAnswer(invocation -> {
                    HttpEntity<String> request = invocation.getArgument(1);
                    attemptedBodies.add(request.getBody());
                    if (writes.getAndIncrement() == 0) {
                        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
                    }
                    return ResponseEntity.noContent().build();
                });
        VictoriaMetricsClusterDataStorage storage = createStorage(10, 3600);

        try {
            // Let the constructor's initial empty periodic run schedule the
            // production-length interval, then invoke that periodic path.
            Thread.sleep(1200);
            saveOneMetric(storage);
            TimerTask periodicTask = (TimerTask) ReflectionTestUtils.getField(storage, "metricsFlushtask");
            assertThat(periodicTask).isNotNull();
            periodicTask.run(null);

            await().atMost(4, TimeUnit.SECONDS)
                    .untilAsserted(() -> assertThat(attemptedBodies).hasSizeGreaterThanOrEqualTo(2));
            assertThat(attemptedBodies.get(1)).isEqualTo(attemptedBodies.get(0));
            assertThat(lineCount(attemptedBodies.get(1))).isEqualTo(1);
        } finally {
            storage.destroy();
        }
    }

    @Test
    void destroyFlushesBufferedMetricsAndRejectsLaterWrites() {
        mockHealthCheck();
        List<String> successfulBodies = new CopyOnWriteArrayList<>();
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenAnswer(invocation -> {
                    HttpEntity<String> request = invocation.getArgument(1);
                    successfulBodies.add(request.getBody());
                    return ResponseEntity.noContent().build();
                });
        VictoriaMetricsClusterDataStorage storage = createStorage(10, 3600);

        saveOneMetric(storage);
        storage.destroy();
        saveOneMetric(storage);

        assertThat(successfulBodies).hasSize(1);
        assertThat(lineCount(successfulBodies.get(0))).isEqualTo(1);
    }

    private void mockHealthCheck() {
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"status\":\"success\"}"));
    }

    private VictoriaMetricsClusterDataStorage createStorage(int bufferSize, int flushInterval) {
        VictoriaMetricsInsertProperties insert =
                new VictoriaMetricsInsertProperties("http://localhost:8480", null, null, bufferSize, flushInterval);
        VictoriaMetricsSelectProperties select =
                new VictoriaMetricsSelectProperties("http://localhost:8481", null, null);
        VictoriaMetricsClusterProperties properties =
                new VictoriaMetricsClusterProperties(true, "0", insert, select);
        return new VictoriaMetricsClusterDataStorage(properties, restTemplate);
    }

    private static void saveOneMetric(VictoriaMetricsClusterDataStorage storage) {
        storage.saveData(VictoriaMetricsDataStorageTest.generateMockedMetricsData());
    }

    private static long lineCount(String body) {
        return body.lines().filter(line -> !line.isBlank()).count();
    }
}
