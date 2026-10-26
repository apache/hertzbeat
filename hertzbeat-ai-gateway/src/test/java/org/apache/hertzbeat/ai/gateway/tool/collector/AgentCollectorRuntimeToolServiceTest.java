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

package org.apache.hertzbeat.ai.gateway.tool.collector;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementService;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeConfigService;
import org.junit.jupiter.api.Test;

class AgentCollectorRuntimeToolServiceTest {
    @Test
    void updatesThroughVersionedServiceAndReadsBackCurrentState() {
        var runtime = mock(CollectorRuntimeConfigService.class);
        var service = new AgentCollectorRuntimeToolService(runtime, mock(CollectorIntakeAdvertisementService.class));
        var config = new ManagedOtelRuntimeConfig(3, 2, true, Duration.ofSeconds(30));
        when(runtime.current("collector-a")).thenReturn(Optional.of(config));
        assertEquals(config, service.runtimeUpdate("collector-a", config));
        verify(runtime).update("collector-a", config);
        verify(runtime).current("collector-a");
    }

    @Test
    void rejectsMissingRuntimeAndNullWrites() {
        var runtime = mock(CollectorRuntimeConfigService.class);
        var service = new AgentCollectorRuntimeToolService(runtime, mock(CollectorIntakeAdvertisementService.class));
        when(runtime.current("missing")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.runtimeGet("missing"));
        assertThrows(IllegalArgumentException.class, () -> service.runtimeUpdate("collector-a", null));
        assertThrows(IllegalArgumentException.class, () -> service.intakeUpdate("collector-a", null));
    }

    @Test
    void intakeClearRemainsAdminOnly() throws Exception {
        assertEquals(AgentToolAccess.ADMIN, AgentCollectorRuntimeToolService.class.getMethod("intakeClear", String.class)
                .getAnnotation(AgentToolPolicy.class).access());
    }
}
