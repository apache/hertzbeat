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

package org.apache.hertzbeat.automated.testing.cases;

import org.apache.hertzbeat.automated.testing.common.Constants;
import org.apache.hertzbeat.automated.testing.common.HertzBeat;
import org.apache.hertzbeat.automated.testing.core.MonitorsEditConfig;
import org.apache.hertzbeat.automated.testing.pages.monitoring.MonitorsNavPage;
import org.apache.hertzbeat.automated.testing.pages.monitoring.monitors.MonitorsDetailPage;
import org.apache.hertzbeat.automated.testing.pages.monitoring.monitors.MonitorsEditPage;
import org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.testcontainers.shaded.org.awaitility.Awaitility;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;

/**
 * hertzbeat h2 mode monitors postgresql
 */
@HertzBeat(composeFiles = {
        "docker/base/hertzbeat-h2-compose.yaml",
        "docker/monitors/postgresql-compose.yaml"
})
public class BaseH2ToPostgresqlTest {

    private NavBarPage navBarPage;

    /**
     * create new postgresql monitor task and verify the end-to-end real-time monitoring metrics
     */
    @Test
    void testRealTimeMetricsDetails() {
        MonitorsEditConfig monitorsEditConfig = MonitorsEditConfig.yamlLoadAs(Constants.POSTGRESQL);

        List<Executable> executables = navBarPage
                .goToTab(MonitorsNavPage.class)
                .clickNewMonitorBtn(Constants.POSTGRESQL)
                .goToInnerTab(MonitorsEditPage.class)
                .edit(monitorsEditConfig)
                .clickOkBtn()
                .goToTab(MonitorsNavPage.class)
                .forcedSleepWait(5) // wait for the task to be generated
                .clickSyncBtn()
                .clickSearchMonitorInput(monitorsEditConfig.getTaskName())
                .clickSearchBtn()
                .forcedSleepWait(10) // wait for the monitoring metrics to be generated
                .clickTaskNameBtn(monitorsEditConfig.getTaskName())
                .goToInnerTab(MonitorsDetailPage.class)
                .addFilterMonitorOptions("Slow Sql")
                .testRealTimeDetail(Constants.POSTGRESQL);

        Awaitility.await()
                .untilAsserted(() -> assertAll(executables));
    }

}
