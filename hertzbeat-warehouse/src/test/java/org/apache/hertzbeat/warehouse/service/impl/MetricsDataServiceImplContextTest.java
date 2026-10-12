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

package org.apache.hertzbeat.warehouse.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class MetricsDataServiceImplContextTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(RealTimeDataReader.class, () -> mock(RealTimeDataReader.class))
            .withBean("duckdbDatabaseDataStorage", HistoryDataReader.class, () -> mock(HistoryDataReader.class))
            .withBean("greptimeDbDataStorage", HistoryDataReader.class, () -> mock(HistoryDataReader.class))
            .withBean(MetricsDataServiceImpl.class);

    @Test
    void contextStartsWhenMultipleHistoryDataReadersArePresent() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(MetricsDataServiceImpl.class);
        });
    }
}
