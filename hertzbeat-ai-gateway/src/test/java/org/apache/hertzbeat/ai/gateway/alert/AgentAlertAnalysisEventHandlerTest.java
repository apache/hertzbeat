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

package org.apache.hertzbeat.ai.gateway.alert;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.service.AlertAnalysisPolicyService;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Tests the single-alert to standard Gateway command boundary. */
@ExtendWith(MockitoExtension.class)
class AgentAlertAnalysisEventHandlerTest {

    @Mock
    private AlertAnalysisPolicyService policyService;

    @Mock
    private GatewayCommandRouter commandRouter;

    private AgentAlertAnalysisEventHandler handler;

    @AfterEach
    void tearDown() {
        if (handler != null) {
            handler.destroy();
        }
    }

    @Test
    void singleAlertPolicyUsesStableAnalysisConversation() {
        AlertAnalysisPolicy policy = AlertAnalysisPolicy.builder()
                .id(7L)
                .name("Production host failures")
                .enabled(true)
                .matchLabels(Map.of("environment", "production"))
                .groupByLabels(List.of("instance"))
                .windowSeconds(300)
                .minimumAlertCount(1)
                .cooldownSeconds(1800)
                .build();
        when(policyService.findEnabled()).thenReturn(List.of(policy));
        handler = new AgentAlertAnalysisEventHandler(policyService, commandRouter);

        handler.onSingleAlertCreated(new SingleAlert.CreatedEvent(SingleAlert.builder()
                .id(42L)
                .fingerprint("alert-42")
                .status("firing")
                .labels(Map.of("environment", "production", "instance", "db-01", "severity", "emergency"))
                .content("Database is unavailable")
                .startAt(1000L)
                .activeAt(1000L)
                .build()));

        ArgumentCaptor<InvokeCommand> command = ArgumentCaptor.forClass(InvokeCommand.class);
        verify(commandRouter, org.mockito.Mockito.timeout(2000)).handle(command.capture());
        assertEquals(AgentRuntimeEntryType.ALERT_TRIGGER, command.getValue().entryType());
        assertEquals(List.of(ActorSupport.ROLE_ALERT_ANALYSIS),
                command.getValue().envelope().getActor().getRoles());
        assertEquals(7L, command.getValue().userInput().getAlertIncident().analysisPolicyId());
        assertEquals(42L, command.getValue().userInput().getAlertIncident().triggerAlertId());
        assertEquals(List.of(42L), command.getValue().userInput().getAlertIncident().alertIds());
        assertEquals(1, command.getValue().userInput().getAlertIncident().alertCount());
        assertTrue(command.getValue().userInput().getConversationId().startsWith("alert-analysis:"));
        assertEquals(command.getValue().commandId(), command.getValue().userInput().getMessageId());
        assertTrue(command.getValue().userInput().getMessage().getText().contains("Database is unavailable"));
        verify(commandRouter).handle(any(InvokeCommand.class));
    }

    @Test
    void twoDistinctAlertsInTheSameInstanceTriggerAnalysis() {
        AlertAnalysisPolicy policy = AlertAnalysisPolicy.builder()
                .id(1L)
                .name("Same host correlation")
                .enabled(true)
                .matchLabels(Map.of())
                .groupByLabels(List.of("instance"))
                .windowSeconds(300)
                .minimumAlertCount(2)
                .cooldownSeconds(1800)
                .build();
        when(policyService.findEnabled()).thenReturn(List.of(policy));
        handler = new AgentAlertAnalysisEventHandler(policyService, commandRouter);

        handler.onSingleAlertCreated(new SingleAlert.CreatedEvent(alert("mytest", "4")));
        handler.onSingleAlertCreated(new SingleAlert.CreatedEvent(alert("demo2", "5")));

        ArgumentCaptor<InvokeCommand> command = ArgumentCaptor.forClass(InvokeCommand.class);
        verify(commandRouter, org.mockito.Mockito.timeout(2000).times(1)).handle(command.capture());
        assertTrue(command.getValue().userInput().getMessage().getText().contains("mytest"));
        assertTrue(command.getValue().userInput().getMessage().getText().contains("demo2"));
        verify(commandRouter, times(1)).handle(any(InvokeCommand.class));
    }

    private SingleAlert alert(String alertName, String defineId) {
        return SingleAlert.builder()
                .id(Long.parseLong(defineId))
                .fingerprint("alertname:" + alertName + ",defineid:" + defineId
                        + ",instance:8.137.157.93:22")
                .status("firing")
                .labels(Map.of(
                        "alertname", alertName,
                        "defineid", defineId,
                        "instance", "8.137.157.93:22",
                        "instancename", "我的阿里云服务器",
                        "provider", "aliyun",
                        "severity", "emergency"))
                .content(alertName)
                .startAt(1000L)
                .activeAt(1000L)
                .build();
    }
}
