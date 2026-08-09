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

package org.apache.hertzbeat.alert.notice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyByte;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.config.AlertSseManager;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for Alert Notice Dispatch
 */
@ExtendWith(MockitoExtension.class)
class AlertNoticeDispatchTest {

    @Mock
    private AlerterWorkerPool workerPool;

    @Mock
    private NoticeConfigService noticeConfigService;

    @Mock
    private AlertStoreHandler alertStoreHandler;

    @Mock
    private PluginRunner pluginRunner;

    @Mock
    private AlertNotifyHandler alertNotifyHandler;

    @Mock
    private AlertSseManager emitterManager;

    private AlertNoticeDispatch alertNoticeDispatch;

    private static final int DISPATCH_THREADS = 3;

    private NoticeReceiver receiver;
    private GroupAlert alert;

    @BeforeEach
    void setUp() {
        when(alertNotifyHandler.type()).thenReturn((byte) 1);
        
        List<AlertNotifyHandler> alertNotifyHandlerList = List.of(alertNotifyHandler);
        alertNoticeDispatch = new AlertNoticeDispatch(
                workerPool,
                noticeConfigService,
                alertStoreHandler,
                alertNotifyHandlerList,
                pluginRunner,
                emitterManager
        );
        
        receiver = NoticeReceiver.builder()
                .id(1L)
                .name("test-receiver")
                .type((byte) 1)
                .build();
        
        alert = GroupAlert.builder()
                .id(1L)
                .status("firing")
                .alerts(Collections.singletonList(SingleAlert.builder()
                        .content("test-content")
                        .build()))
                .build();
    }

    @Test
    void testSendNoticeMsg() {
        NoticeTemplate template = new NoticeTemplate();
        template.setId(1L);
        template.setName("default-template");
        when(noticeConfigService.getDefaultNoticeTemplateByType((byte) 1)).thenReturn(template);
        doNothing().when(alertNotifyHandler).send(eq(receiver), eq(template), eq(alert));
        
        assertTrue(alertNoticeDispatch.sendNoticeMsg(receiver, null, alert));
        verify(alertNotifyHandler).send(eq(receiver), eq(template), eq(alert));
    }

    @Test
    void testSendNoticeMsgReceiverNull() {
        GroupAlert alert = new GroupAlert();
        alert.setId(1L);
        alert.setStatus("firing");
        
        boolean result = alertNoticeDispatch.sendNoticeMsg(null, null, alert);
        assertFalse(result);
    }

    @Test
    void testSendNoticeMsgReceiverTypeNull() {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("test-receiver");
        
        GroupAlert alert = new GroupAlert();
        alert.setId(1L);
        alert.setStatus("firing");

        boolean result = alertNoticeDispatch.sendNoticeMsg(receiver, null, alert);
        assertFalse(result);
    }

    @Test
    void testSendNoticeMsgNoHandler() {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("test-receiver");
        receiver.setType((byte) 2);
        
        GroupAlert alert = new GroupAlert();
        alert.setId(1L);
        alert.setStatus("firing");

        assertFalse(alertNoticeDispatch.sendNoticeMsg(receiver, null, alert));
    }

    @Test
    void testDispatchAlarmUsesTypedNotifyExecution() {
        NoticeTemplate template = new NoticeTemplate();
        template.setId(1L);
        template.setName("default-template");

        when(alertStoreHandler.store(alert)).thenReturn(alert);
        when(noticeConfigService.getReceiverFilterRule(alert)).thenReturn(Collections.singletonList(
                org.apache.hertzbeat.common.entity.alerter.NoticeRule.builder()
                        .receiverId(Collections.singletonList(1L))
                        .templateId(1L)
                        .build()));
        when(noticeConfigService.getReceiverById(1L)).thenReturn(receiver);
        when(noticeConfigService.getOneTemplateById(1L)).thenReturn(template);
        doNothing().when(alertNotifyHandler).send(eq(receiver), eq(template), eq(alert));
        doAnswer(invocation -> {
            Runnable task = invocation.getArgument(1);
            task.run();
            return null;
        }).when(workerPool).executeNotify(anyByte(), any(Runnable.class));

        alertNoticeDispatch.dispatchAlarm(alert);

        verify(workerPool).executeNotify(eq((byte) 1), any(Runnable.class));
        verify(alertNotifyHandler).send(eq(receiver), eq(template), eq(alert));
        verify(emitterManager).broadcast(any(String.class));
    }

    @Test
    void testDispatchAlarmRecomputesNoticeFromAlertsMatchingRuleLabels() {
        LocalDateTime matchingCreated = LocalDateTime.of(2026, 7, 30, 10, 0);
        LocalDateTime matchingUpdated = LocalDateTime.of(2026, 7, 30, 10, 5);
        SingleAlert matchingAlert = SingleAlert.builder()
                .fingerprint("matching")
                .labels(Map.of("department", "algorithm", "service", "checkout", "severity", "warning"))
                .annotations(Map.of("summary", "algorithm summary", "runbook", "shared runbook"))
                .content("matching-content")
                .status("resolved")
                .gmtCreate(matchingCreated)
                .gmtUpdate(matchingUpdated)
                .build();
        SingleAlert unrelatedAlert = SingleAlert.builder()
                .fingerprint("unrelated")
                .labels(Map.of("department", "infra", "service", "checkout", "severity", "critical"))
                .annotations(Map.of("summary", "infra summary", "runbook", "shared runbook"))
                .content("unrelated-content")
                .status("firing")
                .gmtCreate(matchingCreated.minusHours(1))
                .gmtUpdate(matchingUpdated.plusHours(1))
                .build();
        GroupAlert groupedAlert = GroupAlert.builder()
                .id(2L)
                .groupKey("department:infra,service:checkout")
                .status("firing")
                .groupLabels(Map.of("department", "infra", "service", "checkout"))
                .commonLabels(Map.of("service", "checkout"))
                .commonAnnotations(Map.of("runbook", "shared runbook"))
                .alertFingerprints(List.of("matching", "unrelated"))
                .gmtCreate(matchingCreated.minusHours(1))
                .gmtUpdate(matchingUpdated.plusHours(1))
                .alerts(List.of(matchingAlert, unrelatedAlert))
                .build();
        NoticeTemplate template = NoticeTemplate.builder().id(1L).build();
        NoticeRule rule = NoticeRule.builder()
                .filterAll(false)
                .labels(Map.of("department", "algorithm"))
                .receiverId(List.of(1L))
                .templateId(1L)
                .build();

        when(alertStoreHandler.store(groupedAlert)).thenReturn(groupedAlert);
        when(noticeConfigService.getReceiverFilterRule(groupedAlert)).thenReturn(List.of(rule));
        when(noticeConfigService.getReceiverById(1L)).thenReturn(receiver);
        when(noticeConfigService.getOneTemplateById(1L)).thenReturn(template);
        doAnswer(invocation -> {
            Runnable task = invocation.getArgument(1);
            task.run();
            return null;
        }).when(workerPool).executeNotify(anyByte(), any(Runnable.class));

        alertNoticeDispatch.dispatchAlarm(groupedAlert);

        ArgumentCaptor<GroupAlert> noticeAlert = ArgumentCaptor.forClass(GroupAlert.class);
        verify(alertNotifyHandler).send(eq(receiver), eq(template), noticeAlert.capture());
        GroupAlert scopedAlert = noticeAlert.getValue();
        assertAll(
                () -> assertEquals(List.of(matchingAlert), scopedAlert.getAlerts()),
                () -> assertEquals(List.of("matching"), scopedAlert.getAlertFingerprints()),
                () -> assertEquals("resolved", scopedAlert.getStatus()),
                () -> assertEquals(
                        Map.of("department", "algorithm", "service", "checkout"),
                        scopedAlert.getGroupLabels()),
                () -> assertEquals(
                        Map.of("department", "algorithm", "service", "checkout", "severity", "warning"),
                        scopedAlert.getCommonLabels()),
                () -> assertEquals(
                        Map.of("summary", "algorithm summary", "runbook", "shared runbook"),
                        scopedAlert.getCommonAnnotations()),
                () -> assertEquals("department:algorithm,service:checkout", scopedAlert.getGroupKey()),
                () -> assertEquals(matchingCreated, scopedAlert.getGmtCreate()),
                () -> assertEquals(matchingUpdated, scopedAlert.getGmtUpdate()),
                () -> assertEquals(2, groupedAlert.getAlerts().size()),
                () -> assertEquals("firing", groupedAlert.getStatus()),
                () -> assertEquals(Map.of("service", "checkout"), groupedAlert.getCommonLabels()));
    }

    @Test
    void testDispatchAlarmScopesMultipleRulesForTheSameReceiverIndependently() {
        SingleAlert algorithmAlert = SingleAlert.builder()
                .fingerprint("algorithm")
                .labels(Map.of("department", "algorithm", "service", "checkout"))
                .annotations(Map.of("summary", "algorithm firing", "runbook", "algorithm runbook"))
                .status("firing")
                .build();
        SingleAlert algorithmResolvedAlert = SingleAlert.builder()
                .fingerprint("algorithm-resolved")
                .labels(Map.of("department", "algorithm", "service", "checkout"))
                .annotations(Map.of("summary", "algorithm resolved", "runbook", "algorithm runbook"))
                .status("resolved")
                .build();
        SingleAlert infrastructureAlert = SingleAlert.builder()
                .fingerprint("infra")
                .labels(Map.of("department", "infra", "service", "checkout"))
                .annotations(Map.of("summary", "infra summary"))
                .status("resolved")
                .build();
        GroupAlert groupedAlert = GroupAlert.builder()
                .status("firing")
                .groupLabels(Map.of("service", "checkout"))
                .alerts(List.of(algorithmAlert, algorithmResolvedAlert, infrastructureAlert))
                .build();
        NoticeTemplate algorithmTemplate = NoticeTemplate.builder().id(1L).build();
        NoticeTemplate infrastructureTemplate = NoticeTemplate.builder().id(2L).build();
        NoticeRule algorithmRule = NoticeRule.builder()
                .filterAll(false)
                .labels(Map.of("department", "algorithm"))
                .receiverId(List.of(1L))
                .templateId(1L)
                .build();
        NoticeRule infrastructureRule = NoticeRule.builder()
                .filterAll(false)
                .labels(Map.of("department", "infra"))
                .receiverId(List.of(1L))
                .templateId(2L)
                .build();

        when(alertStoreHandler.store(groupedAlert)).thenReturn(groupedAlert);
        when(noticeConfigService.getReceiverFilterRule(groupedAlert))
                .thenReturn(List.of(algorithmRule, infrastructureRule));
        when(noticeConfigService.getReceiverById(1L)).thenReturn(receiver);
        when(noticeConfigService.getOneTemplateById(1L)).thenReturn(algorithmTemplate);
        when(noticeConfigService.getOneTemplateById(2L)).thenReturn(infrastructureTemplate);
        doAnswer(invocation -> {
            Runnable task = invocation.getArgument(1);
            task.run();
            return null;
        }).when(workerPool).executeNotify(anyByte(), any(Runnable.class));

        alertNoticeDispatch.dispatchAlarm(groupedAlert);

        ArgumentCaptor<NoticeTemplate> templates = ArgumentCaptor.forClass(NoticeTemplate.class);
        ArgumentCaptor<GroupAlert> alerts = ArgumentCaptor.forClass(GroupAlert.class);
        verify(alertNotifyHandler, times(2)).send(eq(receiver), templates.capture(), alerts.capture());
        assertAll(
                () -> assertEquals(List.of(algorithmTemplate, infrastructureTemplate), templates.getAllValues()),
                () -> assertEquals(
                        List.of("algorithm", "algorithm-resolved"),
                        alerts.getAllValues().get(0).getAlertFingerprints()),
                () -> assertEquals(List.of("infra"), alerts.getAllValues().get(1).getAlertFingerprints()),
                () -> assertEquals("firing", alerts.getAllValues().get(0).getStatus()),
                () -> assertEquals("resolved", alerts.getAllValues().get(1).getStatus()),
                () -> assertEquals(
                        Map.of("runbook", "algorithm runbook"),
                        alerts.getAllValues().get(0).getCommonAnnotations()),
                () -> assertEquals(
                        Map.of("summary", "infra summary"),
                        alerts.getAllValues().get(1).getCommonAnnotations()));
    }
}
