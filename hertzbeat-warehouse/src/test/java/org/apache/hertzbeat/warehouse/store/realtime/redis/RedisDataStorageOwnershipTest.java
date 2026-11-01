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

package org.apache.hertzbeat.warehouse.store.realtime.redis;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.lettuce.core.RedisFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.serialize.RedisMetricsDataCodec;
import org.apache.hertzbeat.warehouse.store.realtime.redis.client.RedisClientOperation;
import org.apache.hertzbeat.warehouse.store.realtime.redis.client.RedisCommandDelegate;
import org.junit.jupiter.api.Test;

class RedisDataStorageOwnershipTest {

    @Test
    void saveDataAwaitsSerializationBeforeReturningSoDispatchCanClose() throws Exception {
        @SuppressWarnings("unchecked")
        RedisClientOperation<String, CollectRep.MetricsData> operation = mock(RedisClientOperation.class);
        RedisCommandDelegate delegate = mock(RedisCommandDelegate.class);
        when(delegate.operate()).thenReturn(operation);

        CountDownLatch enteredGet = new CountDownLatch(1);
        CountDownLatch allowGetFinish = new CountDownLatch(1);
        AtomicBoolean saveDataReturned = new AtomicBoolean(false);

        doAnswer(invocation -> {
            CollectRep.MetricsData value = invocation.getArgument(2);
            Consumer<RedisFuture<Boolean>> consumer = invocation.getArgument(3);
            @SuppressWarnings("unchecked")
            RedisFuture<Boolean> future = mock(RedisFuture.class);

            when(future.thenAccept(any())).thenReturn(null);
            when(future.get()).thenAnswer(getInvocation -> {
                enteredGet.countDown();
                assertTrue(allowGetFinish.await(2, TimeUnit.SECONDS));
                // Lettuce encodes before the future completes; model that here.
                new RedisMetricsDataCodec().encodeValue(value);
                assertFalse(saveDataReturned.get(),
                        "saveData must block until Redis serialization/future completes");
                return Boolean.TRUE;
            });

            consumer.accept(future);
            return null;
        }).when(operation).hset(eq("42"), eq("cpu"), any(), any());

        RedisDataStorage storage = new RedisDataStorage(delegate, true);
        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setMetrics("cpu")
                .setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("usage").setType(0).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("77").build())
                .build();

        Thread saver = new Thread(() -> {
            storage.saveData(metricsData);
            saveDataReturned.set(true);
        }, "redis-save-test");
        saver.start();

        assertTrue(enteredGet.await(2, TimeUnit.SECONDS));
        Thread.sleep(50L);
        assertFalse(saveDataReturned.get(), "saveData still waiting on Redis future");
        allowGetFinish.countDown();
        saver.join(2000L);
        assertTrue(saveDataReturned.get());

        // DataStorageDispatch closes after saveData returns; that close must be safe.
        assertDoesNotThrow(metricsData::close);
    }
}
