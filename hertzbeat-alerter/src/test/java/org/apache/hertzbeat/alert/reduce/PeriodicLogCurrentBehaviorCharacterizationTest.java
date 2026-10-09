/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.alert.reduce;

import static org.apache.hertzbeat.common.constants.CommonConstants.LOG_ALERT_THRESHOLD_TYPE_PERIODIC;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyByte;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.calculate.periodic.LogPeriodicAlertCalculator;
import org.apache.hertzbeat.alert.config.AlertSseManager;
import org.apache.hertzbeat.alert.dao.AlertGroupConvergeDao;
import org.apache.hertzbeat.alert.notice.AlertNoticeDispatch;
import org.apache.hertzbeat.alert.notice.AlertNotifyHandler;
import org.apache.hertzbeat.alert.notice.AlertStoreHandler;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.common.concurrent.ManagedExecutor;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.ApplicationEventPublisher;

/** Observes current behavior, not an approved product contract. No scheduler or transport runs. */
class PeriodicLogCurrentBehaviorCharacterizationTest {

    @ParameterizedTest
    @ValueSource(ints = {7, 8})
    void characterizesCurrentGroupedEvaluationsReachingMockDispatchTwiceWithCountDependentFingerprint(int secondCount)
            throws Exception {
        DataSourceService datasource = mock(DataSourceService.class);
        AlertStoreHandler store = mock(AlertStoreHandler.class);
        NoticeConfigService notices = mock(NoticeConfigService.class);
        AlertNotifyHandler handler = mock(AlertNotifyHandler.class);
        AlerterWorkerPool workers = mock(AlerterWorkerPool.class);
        ManagedExecutor executor = mock(ManagedExecutor.class);
        List<GroupAlert> stored = new ArrayList<>();
        NoticeReceiver receiver = NoticeReceiver.builder().id(1L).type((byte) 0).build();
        when(handler.type()).thenReturn((byte) 0);
        when(notices.getReceiverFilterRule(any())).thenReturn(
                List.of(NoticeRule.builder().receiverId(List.of(1L)).build()));
        when(notices.getReceiverById(1L)).thenReturn(receiver);
        // Mock persistence only assigns IDs; it deliberately does not invent database deduplication.
        when(store.store(any())).thenAnswer(invocation -> {
            GroupAlert alert = invocation.getArgument(0);
            alert.setId(1L);
            alert.getAlerts().forEach(single -> single.setId(1L));
            stored.add(alert);
            return alert;
        });
        doAnswer(invocation -> {
            invocation.<Runnable>getArgument(1).run();
            return null;
        }).when(workers).executeNotify(anyByte(), any());
        doAnswer(invocation -> {
            invocation.<Runnable>getArgument(0).run();
            return null;
        }).when(executor).execute(any());
        AlertNoticeDispatch dispatch = new AlertNoticeDispatch(workers, notices, store, List.of(handler),
                mock(PluginRunner.class), mock(AlertSseManager.class), mock(ApplicationEventPublisher.class));
        // Inhibition/silence are a pass-through test boundary, not a claim about configured filters.
        AlarmInhibitReduce inhibition = mock(AlarmInhibitReduce.class);
        when(inhibition.inhibitAlarm(any())).thenAnswer(invocation ->
                dispatch.dispatchAlarm(invocation.getArgument(0)));
        AlarmGroupReduce groups = new AlarmGroupReduce(inhibition, mock(AlertGroupConvergeDao.class),
                VirtualThreadProperties.defaults());
        AlertGroupConverge convergence = new AlertGroupConverge();
        convergence.setName("characterization");
        convergence.setGroupLabels(List.of("defineid"));
        convergence.setGroupWait(3600L);
        convergence.setGroupInterval(3600L);
        convergence.setRepeatInterval(3600L);
        groups.refreshGroupDefines(List.of(convergence));
        AlarmCommonReduce reducer = new AlarmCommonReduce(groups, executor);
        AlertDefine rule = AlertDefine.builder().id(1L).name("characterization").type(LOG_ALERT_THRESHOLD_TYPE_PERIODIC)
                .datasource("sql").expr("SELECT errorCount FROM hertzbeat_logs")
                .period(300).times(3).labels(Map.of("alert_mode", "group")).template("Count ${errorCount}")
                .enable(true).build();
        when(datasource.query(anyString(), anyString(), eq(LOG_ALERT_THRESHOLD_TYPE_PERIODIC)))
                .thenReturn(List.of(Map.of("errorCount", 7)), List.of(Map.of("errorCount", secondCount)));
        LogPeriodicAlertCalculator calculator = new LogPeriodicAlertCalculator(datasource, reducer);
        try {
            // Synchronous test executors: two explicit calls, no timer, polling or application context.
            calculator.calculate(rule);
            calculator.calculate(rule);

            assertEquals(2, stored.size());
            assertEquals(stored.getFirst().getGroupKey(), stored.getLast().getGroupKey());
            String firstFingerprint = stored.getFirst().getAlerts().getFirst().getFingerprint();
            String secondFingerprint = stored.getLast().getAlerts().getFirst().getFingerprint();
            if (secondCount == 7) assertEquals(firstFingerprint, secondFingerprint);
            else assertNotEquals(firstFingerprint, secondFingerprint);
            assertEquals("firing", stored.getFirst().getStatus());
            assertEquals("firing", stored.getLast().getStatus());
            verify(store, times(2)).store(any());
            verify(handler, times(2)).send(eq(receiver), any(), any());
        } finally {
            reducer.destroy();
            groups.destroy();
        }
    }
}
