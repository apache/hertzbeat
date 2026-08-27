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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;

import io.greptime.models.TableSchema;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;

class GreptimeMetricSchemaCacheTest {

    @Test
    void reusesEquivalentSchemaAndRebuildsAfterEvolution() {
        GreptimeMetricSchemaCache cache = new GreptimeMetricSchemaCache(8);
        CollectRep.Field usage = field("usage", CommonConstants.TYPE_NUMBER, false);
        CollectRep.Field equivalentUsage = field("usage", CommonConstants.TYPE_NUMBER, false);
        CollectRep.Field changedUsage = field("usage", CommonConstants.TYPE_STRING, false);
        CollectRep.Field device = field("device", CommonConstants.TYPE_STRING, true);

        TableSchema initial = cache.getOrCreate("linux_cpu", List.of(usage, device));

        assertSame(initial, cache.getOrCreate("linux_cpu", List.of(equivalentUsage, device)));
        assertNotSame(initial, cache.getOrCreate("linux_cpu", List.of(changedUsage, device)));
    }

    @Test
    void keepsSchemasForDifferentTablesIndependent() {
        GreptimeMetricSchemaCache cache = new GreptimeMetricSchemaCache(8);
        List<CollectRep.Field> fields = List.of(field("usage", CommonConstants.TYPE_NUMBER, false));

        assertNotSame(
                cache.getOrCreate("linux_cpu", fields),
                cache.getOrCreate("linux_memory", fields));
    }

    @Test
    void publishesOneSchemaForConcurrentEquivalentBatches() throws Exception {
        GreptimeMetricSchemaCache cache = new GreptimeMetricSchemaCache(8);
        List<CollectRep.Field> fields = List.of(field("usage", CommonConstants.TYPE_NUMBER, false));
        CountDownLatch start = new CountDownLatch(1);

        try (ExecutorService executor = Executors.newFixedThreadPool(8)) {
            List<Future<TableSchema>> schemas = java.util.stream.IntStream.range(0, 32)
                    .mapToObj(ignored -> executor.submit(() -> {
                        start.await();
                        return cache.getOrCreate("linux_cpu", fields);
                    }))
                    .toList();
            start.countDown();
            TableSchema first = schemas.getFirst().get();
            for (Future<TableSchema> schema : schemas) {
                assertSame(first, schema.get());
            }
        }
    }

    private CollectRep.Field field(String name, int type, boolean label) {
        return CollectRep.Field.newBuilder()
                .setName(name)
                .setType(type)
                .setLabel(label)
                .build();
    }
}
