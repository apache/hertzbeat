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

package org.apache.hertzbeat.push.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.push.dao.PushMonitorDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link PushGatewayServiceImpl}.
 *
 * <p>`/api/push/prometheus/**` is unauthenticated by design, so the resource a single
 * anonymous request may consume has to be bounded: the body it may carry, the samples it
 * may enqueue, and the number of push monitors it may bring into existence.
 */
@ExtendWith(MockitoExtension.class)
class PushGatewayServiceImplTest {

    private static final String BODY = "sample_metric{label=\"a\"} 1\n";

    @Mock
    private CommonDataQueue commonDataQueue;

    @Mock
    private PushMonitorDao pushMonitorDao;

    @BeforeEach
    void setUp() {
        // The stream test below builds no service, so this default must not be strict
        lenient().when(pushMonitorDao.findMonitorsByType((byte) 1)).thenReturn(List.of());
    }

    private PushGatewayServiceImpl createService(int maxMonitors, long maxBodyBytes, int maxSamples) {
        return new PushGatewayServiceImpl(commonDataQueue, pushMonitorDao, maxMonitors, maxBodyBytes, maxSamples);
    }

    private static ByteArrayInputStream createBody(String content) {
        return new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * The exposition format requires the names of a label set to be unique, so a sample that
     * repeats one is refused rather than resolved. It stays a rejection though: answering it
     * with an error trace would let a malformed body fill the log on an anonymous route.
     */
    @Test
    void testSampleRepeatingTheLabelNameIsRejected() {
        final PushGatewayServiceImpl service = createService(10, 1024, 100);

        assertFalse(service.pushPrometheusMetrics(
                createBody("sample_metric{label=\"a\",label=\"b\"} 1\n"), "job1", "instance1"));

        verify(commonDataQueue, never()).sendMetricsData(any());
    }

    @Test
    void testPushIsAcceptedWithinTheLimits() {
        final PushGatewayServiceImpl service = createService(10, 1024, 100);

        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job1", "instance1"));

        verify(pushMonitorDao).save(any(Monitor.class));
    }

    @Test
    void testBodyBeyondTheByteLimitIsRejected() {
        final PushGatewayServiceImpl service = createService(10, 16, 100);

        assertFalse(service.pushPrometheusMetrics(createBody(BODY.repeat(100)), "job1", "instance1"));

        verify(pushMonitorDao, never()).save(any(Monitor.class));
    }

    @Test
    void testBodyBeyondTheSampleLimitIsRejected() {
        final PushGatewayServiceImpl service = createService(10, 1024 * 1024, 2);
        final StringBuilder many = new StringBuilder();
        for (int index = 0; index < 10; index++) {
            many.append("sample_metric{label=\"value").append(index).append("\"} 1\n");
        }
        final ByteArrayInputStream inputStream = createBody(many.toString());

        assertFalse(service.pushPrometheusMetrics(inputStream, "job1", "instance1"));
        assertTrue(inputStream.available() > 0, "the parser should stop before consuming the remaining samples");

        verify(pushMonitorDao, never()).save(any(Monitor.class));
    }

    @Test
    void testBodyAtTheSampleLimitIsAccepted() {
        final PushGatewayServiceImpl service = createService(10, 1024, 2);
        final String twoSamples = "sample_metric{label=\"a\"} 1\n"
                + "sample_metric{label=\"b\"} 2\n";

        assertTrue(service.pushPrometheusMetrics(createBody(twoSamples), "job1", "instance1"));
    }

    /**
     * An unknown job/instance pair persists a monitor row and adds a map entry that is
     * never removed, so without a cap an anonymous caller iterating over made up names
     * grows the database and the heap without bound.
     */
    @Test
    void testAutoCreationStopsAtTheMonitorLimit() {
        final PushGatewayServiceImpl service = createService(2, 1024, 100);

        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job1", "instance1"));
        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job2", "instance2"));
        assertFalse(service.pushPrometheusMetrics(createBody(BODY), "job3", "instance3"));

        verify(pushMonitorDao, times(2)).save(any(Monitor.class));
    }

    /**
     * The cap must not turn into eviction: a pair already known has to keep resolving to
     * the monitor it created, otherwise a later push would create a second monitor for the
     * same job and instance.
     */
    @Test
    void testKnownPairsKeepWorkingAtTheLimit() {
        final PushGatewayServiceImpl service = createService(1, 1024, 100);

        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job1", "instance1"));
        assertFalse(service.pushPrometheusMetrics(createBody(BODY), "other", "instance"));
        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job1", "instance1"));

        verify(pushMonitorDao, times(1)).save(any(Monitor.class));
    }

    /**
     * The route is anonymous, so nothing stops a caller from sending its unknown pairs all at
     * once. Testing the cap and claiming the entry in two steps lets every request that already
     * passed the test create a monitor of its own, which is the cap being exceeded by as many
     * requests as the container serves in parallel.
     */
    @Test
    void testConcurrentPushesForUnknownPairsStopAtTheMonitorLimit() throws Exception {
        final int callers = 16;
        final PushGatewayServiceImpl service = createService(1, 1024, 100);
        final CyclicBarrier startTogether = new CyclicBarrier(callers);
        final ExecutorService pool = Executors.newFixedThreadPool(callers);
        final AtomicInteger accepted = new AtomicInteger();
        try {
            final List<Future<?>> pushes = new ArrayList<>();
            for (int index = 0; index < callers; index++) {
                final String instance = "instance" + index;
                pushes.add(pool.submit(() -> {
                    startTogether.await();
                    if (service.pushPrometheusMetrics(createBody(BODY), "job", instance)) {
                        accepted.incrementAndGet();
                    }
                    return null;
                }));
            }
            for (final Future<?> push : pushes) {
                push.get(30, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertEquals(1, accepted.get());
        verify(pushMonitorDao, times(1)).save(any(Monitor.class));
    }

    @Test
    void testFailedSaveDoesNotConsumeTheMonitorLimit() {
        when(pushMonitorDao.save(any(Monitor.class)))
                .thenThrow(new IllegalStateException("database unavailable"))
                .thenAnswer(invocation -> invocation.getArgument(0));
        final PushGatewayServiceImpl service = createService(1, 1024, 100);

        assertFalse(service.pushPrometheusMetrics(createBody(BODY), "job1", "instance1"));
        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job2", "instance2"));

        verify(pushMonitorDao, times(2)).save(any(Monitor.class));
    }

    @Test
    void testNegativeLimitsAreRejectedAtConstruction() {
        assertThrows(IllegalArgumentException.class, () -> createService(-1, 1024, 100));
        assertThrows(IllegalArgumentException.class, () -> createService(1, -1, 100));
        assertThrows(IllegalArgumentException.class, () -> createService(1, 1024, -1));
    }

    @Test
    void testConcurrentPushesForTheSamePairCreateOneMonitor() throws Exception {
        final int callers = 8;
        final CyclicBarrier startTogether = new CyclicBarrier(callers);
        final PushGatewayServiceImpl service = createService(1, 1024, 100);
        final ExecutorService pool = Executors.newFixedThreadPool(callers);
        try {
            final List<Future<Boolean>> pushes = new ArrayList<>();
            for (int index = 0; index < callers; index++) {
                pushes.add(pool.submit(() -> {
                    startTogether.await();
                    return service.pushPrometheusMetrics(createBody(BODY), "job", "instance");
                }));
            }
            for (final Future<Boolean> push : pushes) {
                assertTrue(push.get(30, TimeUnit.SECONDS));
            }
        } finally {
            pool.shutdownNow();
        }

        verify(pushMonitorDao).save(any(Monitor.class));
    }

    /**
     * A request may read no entry for a pair and only then claim the creation, by which time
     * another request may have created that pair and cleared its claim. Without a second lookup
     * once the claim is won, this request goes on to create the same pair again, leaving two
     * monitors for one pair and a slot of the cap spent for good.
     *
     * <p>The interleaving is forced rather than raced: the map hands back a miss, and while it
     * does, a competing push runs its whole creation.
     */
    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void testStaleMissDoesNotCreateTwoMonitorsForOnePair() throws Exception {
        final PushGatewayServiceImpl service = createService(2, 1024, 100);
        final Field trackedPairs = PushGatewayServiceImpl.class.getDeclaredField("jobInstanceMap");
        trackedPairs.setAccessible(true);
        final AtomicBoolean competed = new AtomicBoolean();
        final Map probing = new ConcurrentHashMap() {
            @Override
            public Object get(Object key) {
                final Object value = super.get(key);
                if (value == null && competed.compareAndSet(false, true)) {
                    service.pushPrometheusMetrics(createBody(BODY), "job1", "instance1");
                }
                return value;
            }
        };
        trackedPairs.set(service, probing);

        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job1", "instance1"));

        verify(pushMonitorDao, times(1)).save(any(Monitor.class));
        assertEquals(1, probing.size());
        // The slot the duplicate would have taken is still there for another pair
        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job2", "instance2"));
    }

    @Test
    void testMonitorsLoadedAtStartupCountTowardsTheLimit() {
        lenient().when(pushMonitorDao.findMonitorsByType((byte) 1)).thenReturn(List.of(
                Monitor.builder().id(1L).app("job1").name("instance1").build()));
        final PushGatewayServiceImpl service = createService(1, 1024, 100);

        assertFalse(service.pushPrometheusMetrics(createBody(BODY), "job2", "instance2"));
        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job1", "instance1"));

        verify(pushMonitorDao, never()).save(any(Monitor.class));
    }

    /**
     * A separator carries no meaning inside a job or an instance name, so the two names must not
     * be joined into a single key: ("job", "a_b") and ("job_a", "b") are different monitors, and
     * the second pair must not push its samples into the monitor the first one created.
     */
    @Test
    void testPairsSharingTheSeparatorAreDistinctMonitors() {
        final PushGatewayServiceImpl service = createService(10, 1024, 100);

        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job", "a_b"));
        assertTrue(service.pushPrometheusMetrics(createBody(BODY), "job_a", "b"));

        verify(pushMonitorDao, times(2)).save(any(Monitor.class));
        final ArgumentCaptor<CollectRep.MetricsData> pushed =
                ArgumentCaptor.forClass(CollectRep.MetricsData.class);
        verify(commonDataQueue, times(2)).sendMetricsData(pushed.capture());
        assertNotEquals(pushed.getAllValues().get(0).getId(), pushed.getAllValues().get(1).getId());
    }

    /**
     * Colliding pairs must not collapse into one entry while the monitors are loaded either,
     * which would let the cap count fewer monitors than the database actually holds.
     */
    @Test
    void testPairsSharingTheSeparatorCountSeparatelyAtStartup() {
        lenient().when(pushMonitorDao.findMonitorsByType((byte) 1)).thenReturn(List.of(
                Monitor.builder().id(1L).app("job").name("a_b").build(),
                Monitor.builder().id(2L).app("job_a").name("b").build()));
        final PushGatewayServiceImpl service = createService(2, 1024, 100);

        assertFalse(service.pushPrometheusMetrics(createBody(BODY), "job3", "instance3"));

        verify(pushMonitorDao, never()).save(any(Monitor.class));
    }

    @Test
    void testBoundedStreamStopsAtTheLimit() throws Exception {
        final PushGatewayServiceImpl.BoundedInputStream stream =
                new PushGatewayServiceImpl.BoundedInputStream(createBody("abcdef"), 3);

        assertEquals('a', stream.read());
        assertEquals('b', stream.read());
        assertEquals('c', stream.read());
        assertThrows(PushGatewayServiceImpl.BodyTooLargeException.class, stream::read);
    }

    /**
     * A body over the limit is a rejection rather than a failure, so it must be distinguishable
     * from a read that genuinely broke: the route is anonymous, and answering every oversized
     * body with an error trace lets a caller fill the log at will.
     */
    @Test
    void testBodyOverTheByteLimitIsRejectedNotFailed() {
        final PushGatewayServiceImpl.BoundedInputStream stream =
                new PushGatewayServiceImpl.BoundedInputStream(createBody(BODY.repeat(100)), 16);

        final IOException raised = assertThrows(IOException.class, stream::readAllBytes);

        assertInstanceOf(PushGatewayServiceImpl.BodyTooLargeException.class, raised);
    }
}
