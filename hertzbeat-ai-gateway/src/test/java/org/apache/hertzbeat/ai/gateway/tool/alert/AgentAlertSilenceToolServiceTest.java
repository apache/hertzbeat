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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.Duration;
import java.util.Map;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Test one-time alert silence boundaries. */
class AgentAlertSilenceToolServiceTest {

    private AlertSilenceService alertSilenceService;
    private AgentAlertSilenceToolService service;

    @BeforeEach
    void setUp() {
        alertSilenceService = mock(AlertSilenceService.class);
        service = new AgentAlertSilenceToolService(alertSilenceService);
    }

    @Test
    void shouldCreateBoundedTimezoneAwareSilence() {
        doAnswer(invocation -> {
            AlertSilence silence = invocation.getArgument(0);
            silence.setId(7L);
            return null;
        }).when(alertSilenceService).addAlertSilence(org.mockito.ArgumentMatchers.any(AlertSilence.class));

        Map<String, Object> result = service.createOnce("maintenance", Map.of("environment", "production"),
                "2026-07-17T10:00:00+08:00", "2026-07-17T12:00:00+08:00", true);

        verify(alertSilenceService).validate(argThat(silence -> silence.getType() == 0
                && !silence.isMatchAll()
                && Duration.between(silence.getPeriodStart(), silence.getPeriodEnd()).toHours() == 2), eq(false));
        assertEquals(7L, result.get("silenceId"));
    }

    @Test
    void shouldRejectUnboundedSilence() {
        assertThrows(IllegalArgumentException.class,
                () -> service.createOnce("maintenance", Map.of(), "2026-01-01T00:00:00Z",
                        "2028-01-01T00:00:00Z", true));
    }
}
