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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionDetailResponse;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionOrigin;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionService;
import org.junit.jupiter.api.Test;

class AgentMonitorDefinitionToolServiceTest {
    @Test
    void detailNeverReturnsDefinitionContentsAndDeletionQuotesRevision() {
        var definitions = mock(MonitorDefinitionService.class);
        var service = new AgentMonitorDefinitionToolService(definitions);
        String revision = "a".repeat(64);
        when(definitions.detail("custom", "en-US"))
                .thenReturn(
                        new MonitorDefinitionDetailResponse(
                                1,
                                "custom",
                                "Custom",
                                MonitorDefinitionOrigin.CUSTOM,
                                true,
                                true,
                                false,
                                "password: secret-sentinel",
                                revision));
        assertFalse(JsonUtil.toJson(service.detail("custom", "en-US")).contains("secret-sentinel"));
        service.delete("custom", revision);
        verify(definitions).delete("custom", "\"" + revision + "\"");
    }

    @Test
    void catalogPagesAreBoundedAndReportPartialIncludingPastEnd() {
        var definitions = mock(MonitorDefinitionService.class);
        var service = new AgentMonitorDefinitionToolService(definitions);
        var item =
                new org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionCatalogItem(
                        "custom",
                        "Custom",
                        MonitorDefinitionOrigin.CUSTOM,
                        true,
                        true,
                        false,
                        "revision");
        when(definitions.catalog(null))
                .thenReturn(
                        new org.apache.hertzbeat.manager.monitor.definition
                                .MonitorDefinitionCatalogResponse(
                                1, java.util.Collections.nCopies(25, item)));
        var first = service.catalog(null, null, null);
        assertEquals(20, first.items().size());
        assertEquals(25, first.total());
        assertEquals(1, first.schemaVersion());
        assertTrue(first.hasMore());
        assertTrue(first.partial());
        var last = service.catalog(null, 20, 20);
        assertEquals(5, last.items().size());
        assertFalse(last.hasMore());
        assertTrue(last.partial());
        assertTrue(service.catalog(null, 30, 20).items().isEmpty());
        assertThrows(IllegalArgumentException.class, () -> service.catalog(null, -1, 20));
        assertThrows(IllegalArgumentException.class, () -> service.catalog(null, 10001, 20));
        assertThrows(IllegalArgumentException.class, () -> service.catalog(null, 0, 101));
    }
}
