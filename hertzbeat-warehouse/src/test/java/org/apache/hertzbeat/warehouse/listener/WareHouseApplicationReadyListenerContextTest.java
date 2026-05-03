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

package org.apache.hertzbeat.warehouse.listener;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.apache.hertzbeat.warehouse.store.history.tsdb.AbstractHistoryDataStorage;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class WareHouseApplicationReadyListenerContextTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean("duckdbDatabaseDataStorage", AbstractHistoryDataStorage.class, () -> mock(AbstractHistoryDataStorage.class))
            .withBean("greptimeDbDataStorage", AbstractHistoryDataStorage.class, () -> mock(AbstractHistoryDataStorage.class))
            .withBean(WareHouseApplicationReadyListener.class);

    @Test
    void contextStartsWhenMultipleHistoryDataStoragesArePresent() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(WareHouseApplicationReadyListener.class);
        });
    }
}
