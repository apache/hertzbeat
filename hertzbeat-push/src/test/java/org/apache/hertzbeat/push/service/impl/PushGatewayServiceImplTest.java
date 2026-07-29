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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.push.dao.PushMonitorDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
        // the stream test below builds no service, so this default must not be strict
        lenient().when(pushMonitorDao.findMonitorsByType((byte) 1)).thenReturn(List.of());
    }

    private PushGatewayServiceImpl service(int maxMonitors, long maxBodyBytes, int maxSamples) {
        return new PushGatewayServiceImpl(commonDataQueue, pushMonitorDao, maxMonitors, maxBodyBytes, maxSamples);
    }

    private static ByteArrayInputStream body(String content) {
        return new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void testPushIsAcceptedWithinTheLimits() {
        PushGatewayServiceImpl service = service(10, 1024, 100);

        assertTrue(service.pushPrometheusMetrics(body(BODY), "job1", "instance1"));

        verify(pushMonitorDao).save(any(Monitor.class));
    }

    @Test
    void testBodyBeyondTheByteLimitIsRejected() {
        PushGatewayServiceImpl service = service(10, 16, 100);

        assertFalse(service.pushPrometheusMetrics(body(BODY.repeat(100)), "job1", "instance1"));

        verify(pushMonitorDao, never()).save(any(Monitor.class));
    }

    @Test
    void testBodyBeyondTheSampleLimitIsRejected() {
        PushGatewayServiceImpl service = service(10, 1024 * 1024, 2);
        StringBuilder many = new StringBuilder();
        for (int index = 0; index < 10; index++) {
            many.append("sample_metric{label=\"value").append(index).append("\"} 1\n");
        }

        assertFalse(service.pushPrometheusMetrics(body(many.toString()), "job1", "instance1"));

        verify(pushMonitorDao, never()).save(any(Monitor.class));
    }

    /**
     * An unknown job/instance pair persists a monitor row and adds a map entry that is
     * never removed, so without a cap an anonymous caller iterating over made up names
     * grows the database and the heap without bound.
     */
    @Test
    void testAutoCreationStopsAtTheMonitorLimit() {
        PushGatewayServiceImpl service = service(2, 1024, 100);

        assertTrue(service.pushPrometheusMetrics(body(BODY), "job1", "instance1"));
        assertTrue(service.pushPrometheusMetrics(body(BODY), "job2", "instance2"));
        assertFalse(service.pushPrometheusMetrics(body(BODY), "job3", "instance3"));

        verify(pushMonitorDao, times(2)).save(any(Monitor.class));
    }

    /**
     * The cap must not turn into eviction: a pair already known has to keep resolving to
     * the monitor it created, otherwise a later push would create a second monitor for the
     * same job and instance.
     */
    @Test
    void testKnownPairsKeepWorkingAtTheLimit() {
        PushGatewayServiceImpl service = service(1, 1024, 100);

        assertTrue(service.pushPrometheusMetrics(body(BODY), "job1", "instance1"));
        assertFalse(service.pushPrometheusMetrics(body(BODY), "other", "instance"));
        assertTrue(service.pushPrometheusMetrics(body(BODY), "job1", "instance1"));

        verify(pushMonitorDao, times(1)).save(any(Monitor.class));
    }

    @Test
    void testMonitorsLoadedAtStartupCountTowardsTheLimit() {
        lenient().when(pushMonitorDao.findMonitorsByType((byte) 1)).thenReturn(List.of(
                Monitor.builder().id(1L).app("job1").name("instance1").build()));
        PushGatewayServiceImpl service = service(1, 1024, 100);

        assertFalse(service.pushPrometheusMetrics(body(BODY), "job2", "instance2"));
        assertTrue(service.pushPrometheusMetrics(body(BODY), "job1", "instance1"));

        verify(pushMonitorDao, never()).save(any(Monitor.class));
    }

    @Test
    void testBoundedStreamStopsAtTheLimit() throws Exception {
        PushGatewayServiceImpl.BoundedInputStream stream =
                new PushGatewayServiceImpl.BoundedInputStream(body("abcdef"), 3);

        assertEquals('a', stream.read());
        assertEquals('b', stream.read());
        assertEquals('c', stream.read());
        assertThrows(IOException.class, stream::read);
    }
}
