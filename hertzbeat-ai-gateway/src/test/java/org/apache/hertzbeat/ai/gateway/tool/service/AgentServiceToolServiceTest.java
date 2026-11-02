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

package org.apache.hertzbeat.ai.gateway.tool.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import org.apache.hertzbeat.manager.service.entity.EntityApmRedReadModelService;
import org.apache.hertzbeat.manager.service.entity.EntityServicePerformanceReadModelService;
import org.junit.jupiter.api.Test;

class AgentServiceToolServiceTest {
    private final EntityServicePerformanceReadModelService performance = mock(EntityServicePerformanceReadModelService.class);
    private final EntityApmRedReadModelService red = mock(EntityApmRedReadModelService.class);
    private final AgentServiceToolService service = new AgentServiceToolService(performance, red);

    @Test
    void delegatesAllRankingFiltersAndDefaultsToExistingReadModel() {
        service.rank("checkout", "prod", 1000, 2000, "latencyP95Ms", "asc", 1, 20);
        verify(performance).query("checkout", "prod", 1000, 2000, "latencyP95Ms", "asc", 1, 20);
        service.rank(null, null, 1000, 2000, null, null, null, null);
        verify(performance).query(null, null, 1000, 2000, "errorCount", "desc", 0, 10);
        service.red(19L, 1000, 2000);
        verify(red).query(19L, 1000, 2000);
    }

    @Test
    void rejectsInvalidEntityBeforeRead() {
        assertThrows(IllegalArgumentException.class, () -> service.red(0, 1000, 2000));
        verifyNoInteractions(red, performance);
    }
}
