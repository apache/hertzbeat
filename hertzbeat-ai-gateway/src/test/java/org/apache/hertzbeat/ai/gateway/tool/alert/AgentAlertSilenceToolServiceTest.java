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
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dto.AlertSilenceRequest;
import org.apache.hertzbeat.alert.dto.AlertSilenceResponse;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
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
            AlertSilenceRequest silence = invocation.getArgument(0);
            return new AlertSilenceResponse(7L, silence.getName(), silence.getEnable(), silence.getMatchAll(),
                    silence.getType(), null, silence.getLabels(), List.of(), silence.getPeriodStart(),
                    silence.getPeriodEnd(), null, null, null, null);
        }).when(alertSilenceService).create(org.mockito.ArgumentMatchers.any(AlertSilenceRequest.class));

        Map<String, Object> result = service.createOnce("maintenance", Map.of("environment", "production"),
                "2026-07-17T10:00:00+08:00", "2026-07-17T12:00:00+08:00", true);

        verify(alertSilenceService).create(argThat(silence -> silence.getType() == 0
                && !silence.getMatchAll()
                && Duration.between(silence.getPeriodStart(), silence.getPeriodEnd()).toHours() == 2));
        assertEquals(7L, result.get("silenceId"));
    }

    @Test
    void shouldRejectUnboundedSilence() {
        assertThrows(IllegalArgumentException.class,
                () -> service.createOnce("maintenance", Map.of(), "2026-01-01T00:00:00Z",
                        "2028-01-01T00:00:00Z", true));
    }
}
