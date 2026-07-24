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

package org.apache.hertzbeat.ai.gateway.tool.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertRuleToolService;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertSilenceToolService;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertToolService;
import org.apache.hertzbeat.ai.gateway.tool.collector.AgentCollectorToolService;
import org.apache.hertzbeat.ai.gateway.tool.log.AgentLogToolService;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorToolService;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.CollectorService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;

/** Test management tool schema registration and production exposure policy. */
class AgentManagementToolRegistrationTest {

    @Test
    void shouldRegisterManagementToolsAsOnDemandWithDangerousDeletes() {
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBean(AgentAlertToolService.class,
                    () -> new AgentAlertToolService(mock(AlertService.class)));
            context.registerBean(AgentAlertSilenceToolService.class,
                    () -> new AgentAlertSilenceToolService(mock(AlertSilenceService.class)));
            context.registerBean(AgentAlertRuleToolService.class,
                    () -> new AgentAlertRuleToolService(mock(AlertDefineService.class), mock(AppService.class)));
            context.registerBean(AgentCollectorToolService.class,
                    () -> new AgentCollectorToolService(mock(CollectorService.class), mock(MonitorService.class),
                            mock(AppService.class), mock(CollectJobScheduling.class)));
            context.registerBean(AgentLogToolService.class,
                    () -> new AgentLogToolService(mock(HistoryDataReader.class)));
            context.registerBean(AgentMonitorToolService.class,
                    () -> new AgentMonitorToolService(mock(MonitorService.class), mock(AppService.class),
                            mock(CollectorMonitorBindDao.class)));
            context.refresh();

            AgentToolRegistry registry = new AgentToolConfiguration()
                    .agentToolRegistry(context.getDefaultListableBeanFactory());
            Map<String, AgentToolDescriptor> tools = registry.descriptors().stream()
                    .collect(Collectors.toMap(AgentToolDescriptor::getName, Function.identity()));

            assertEquals(38, tools.size());
            assertEquals(AgentToolExposure.MODEL_VISIBLE, tools.get("monitor.query").getExposure());
            Set<String> visibleTools = Set.of("monitor.query", "monitor.get", "alert.query", "alert.summary",
                    "alert.get");
            assertTrue(tools.entrySet().stream()
                    .filter(entry -> !visibleTools.contains(entry.getKey()))
                    .allMatch(entry -> entry.getValue().getExposure() == AgentToolExposure.MODEL_ON_DEMAND));
            Set<String> destructiveTools = Set.of("monitor.delete", "alert.delete", "alert_rule.delete",
                    "alert_silence.delete", "collector.delete");
            assertTrue(destructiveTools.stream()
                    .allMatch(name -> tools.get(name).getRisk() == AgentToolRisk.DANGEROUS));
        }
    }
}
