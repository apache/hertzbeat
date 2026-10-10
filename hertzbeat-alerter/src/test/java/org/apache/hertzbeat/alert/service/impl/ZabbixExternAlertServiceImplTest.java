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

package org.apache.hertzbeat.alert.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import java.util.Map;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ZabbixExternAlertServiceImplTest {

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @InjectMocks
    private ZabbixExternAlertServiceImpl externAlertService;

    @Test
    void ignoresExternalPersistenceIdentityWithoutChangingRecoverySemantics() {
        SingleAlert incoming = SingleAlert.builder()
                .id(123L)
                .fingerprint("untrusted-zabbix-fingerprint")
                .labels(Map.of(
                        "alertname", "High CPU usage",
                        "source", "zabbix",
                        "zabbix_trigger_id", "42"))
                .annotations(Map.of("summary", "Recovered"))
                .status("resolved")
                .startAt(1_776_000_000_000L)
                .activeAt(1_776_000_000_000L)
                .endAt(1_776_000_300_000L)
                .build();

        externAlertService.addExternAlert("team-a", JsonUtil.toJson(incoming));

        ArgumentCaptor<SingleAlert> alertCaptor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(eq("team-a"), alertCaptor.capture());
        SingleAlert submitted = alertCaptor.getValue();
        assertNull(submitted.getId());
        assertEquals("resolved", submitted.getStatus());
        assertEquals(1_776_000_000_000L, submitted.getStartAt());
        assertEquals(1_776_000_300_000L, submitted.getEndAt());
        assertEquals(incoming.getLabels(), submitted.getLabels());
    }
}
