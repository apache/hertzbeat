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

package org.apache.hertzbeat.collector.collect.ipmi2;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.GlobalConnectionCache;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiClient;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiConnection;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.IpmiProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class IpmiConnectionCacheTest {
    private final String host = "synthetic-" + UUID.randomUUID();

    @Test
    void changingEffectiveTimeoutCreatesAnotherConnection() throws Exception {
        var collector = new IpmiCollectImpl();
        var first = mock(IpmiConnection.class);
        var second = mock(IpmiConnection.class);
        var firstClient = mock(IpmiClient.class);
        var secondClient = mock(IpmiClient.class);
        when(firstClient.connect()).thenReturn(first);
        when(secondClient.connect()).thenReturn(second);
        when(first.isActive()).thenReturn(true);
        when(second.isActive()).thenReturn(true);
        try (var factory = Mockito.mockStatic(IpmiClient.class)) {
            factory.when(() -> IpmiClient.create(any())).thenReturn(firstClient, secondClient);
            collector.collect(CollectRep.MetricsData.newBuilder(), metrics("100"));
            collector.collect(CollectRep.MetricsData.newBuilder(), metrics("250"));
            collector.collect(CollectRep.MetricsData.newBuilder(), metrics("250.0"));
            factory.verify(() -> IpmiClient.create(any()), times(2));
            verify(first, times(1)).getResource(any(), any());
            verify(second, times(2)).getResource(any(), any());
        } finally {
            clear("100", "250");
        }
    }

    @Test
    void oldRequestFailureDoesNotEvictReplacement() throws Exception {
        var collector = new IpmiCollectImpl();
        var oldConnection = mock(IpmiConnection.class);
        var newConnection = mock(IpmiConnection.class);
        var oldClient = mock(IpmiClient.class);
        var newClient = mock(IpmiClient.class);
        when(oldClient.connect()).thenReturn(oldConnection);
        when(newClient.connect()).thenReturn(newConnection);
        when(oldConnection.isActive()).thenReturn(false);
        when(newConnection.isActive()).thenReturn(true);
        CountDownLatch oldEntered = new CountDownLatch(1);
        CountDownLatch releaseOld = new CountDownLatch(1);
        doAnswer(ignored -> {
            oldEntered.countDown();
            releaseOld.await();
            throw new IOException("synthetic exchange failure");
        }).when(oldConnection).getResource(any(), any());
        var callers = Executors.newSingleThreadExecutor();
        try {
            var oldCall = callers.submit(() -> {
                try (var factory = Mockito.mockStatic(IpmiClient.class)) {
                    factory.when(() -> IpmiClient.create(any())).thenReturn(oldClient);
                    var builder = CollectRep.MetricsData.newBuilder();
                    collector.collect(builder, metrics("100"));
                    return builder.getCode();
                }
            });
            assertTrue(oldEntered.await(5, TimeUnit.SECONDS));
            try (var factory = Mockito.mockStatic(IpmiClient.class)) {
                factory.when(() -> IpmiClient.create(any())).thenReturn(newClient);
                collector.collect(CollectRep.MetricsData.newBuilder(), metrics("100"));
                releaseOld.countDown();
                assertEquals(CollectRep.Code.UN_CONNECTABLE, oldCall.get(5, TimeUnit.SECONDS));
                collector.collect(CollectRep.MetricsData.newBuilder(), metrics("100"));
                factory.verify(() -> IpmiClient.create(any()), times(1));
                verify(oldConnection, times(1)).close();
                verify(newConnection, never()).close();
                verify(newConnection, times(2)).getResource(any(), any());
            }
        } finally {
            releaseOld.countDown();
            callers.shutdownNow();
            assertTrue(callers.awaitTermination(5, TimeUnit.SECONDS));
            clear("100");
        }
    }

    private Metrics metrics(String timeout) {
        IpmiProtocol protocol = IpmiProtocol.builder().host(host).port("623").username("synthetic-user")
                .password("synthetic-password").timeout(timeout).build();
        return Metrics.builder().name("Chassis").ipmi(protocol).build();
    }

    private void clear(String... timeouts) {
        var cache = GlobalConnectionCache.getInstance();
        cache.removeCache(identifier(null));
        for (String timeout : timeouts) {
            cache.removeCache(identifier("ipmi-timeout:" + timeout));
        }
    }

    private CacheIdentifier identifier(String customArg) {
        return CacheIdentifier.builder().ip(host).port("623").username("synthetic-user")
                .password("synthetic-password").customArg(customArg).build();
    }
}
