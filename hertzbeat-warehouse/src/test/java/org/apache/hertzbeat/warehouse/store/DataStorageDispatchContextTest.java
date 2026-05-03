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

package org.apache.hertzbeat.warehouse.store;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import jakarta.persistence.EntityManagerFactory;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataWriter;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataWriter;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;

class DataStorageDispatchContextTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(CommonDataQueue.class, () -> mock(CommonDataQueue.class))
            .withBean(WarehouseWorkerPool.class, () -> mock(WarehouseWorkerPool.class))
            .withBean(JdbcTemplate.class, () -> mock(JdbcTemplate.class))
            .withBean(RealTimeDataWriter.class, () -> mock(RealTimeDataWriter.class))
            .withBean(PluginRunner.class, () -> mock(PluginRunner.class))
            .withBean(EntityManagerFactory.class, () -> mock(EntityManagerFactory.class))
            .withBean("duckdbDatabaseDataStorage", HistoryDataWriter.class, () -> mock(HistoryDataWriter.class))
            .withBean("greptimeDbDataStorage", HistoryDataWriter.class, () -> mock(HistoryDataWriter.class))
            .withBean(DataStorageDispatch.class);

    @Test
    void contextStartsWhenMultipleHistoryDataWritersArePresent() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(DataStorageDispatch.class);
        });
    }
}
