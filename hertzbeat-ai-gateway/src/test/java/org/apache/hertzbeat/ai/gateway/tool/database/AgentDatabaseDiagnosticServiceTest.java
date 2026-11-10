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

package org.apache.hertzbeat.ai.gateway.tool.database;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Regression tests for the jdbc url guards in {@link AgentDatabaseDiagnosticService}.
 */
class AgentDatabaseDiagnosticServiceTest {

    private static final Long MONITOR_ID = 1L;

    private MonitorService monitorService;
    private AgentDatabaseDiagnosticService service;

    @BeforeEach
    void setUp() {
        monitorService = mock(MonitorService.class);
        service = new AgentDatabaseDiagnosticService(monitorService);
    }

    @Test
    void databaseParamCarryingJdbcPropertiesIsRejected() {
        stubMonitor(monitorParam("host", "127.0.0.1"),
                monitorParam("username", "root"),
                monitorParam("port", "3306"),
                monitorParam("database", "db?allowLoadLocalInfile=true"));
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.explainQuery(MONITOR_ID, "SELECT 1"));
        assertTrue(exception.getMessage().startsWith("Invalid database name"),
                "unexpected message: " + exception.getMessage());
    }

    @Test
    void hostCarryingUrlSyntaxIsRejected() {
        stubMonitor(monitorParam("host", "127.0.0.1/db?allowLoadLocalInfile=true"),
                monitorParam("username", "root"),
                monitorParam("port", "3306"),
                monitorParam("database", "db"));
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.explainQuery(MONITOR_ID, "SELECT 1"));
        assertTrue(exception.getMessage().startsWith("Invalid database host"),
                "unexpected message: " + exception.getMessage());
    }

    @Test
    void portCarryingUrlSyntaxIsRejected() {
        stubMonitor(monitorParam("host", "127.0.0.1"),
                monitorParam("username", "root"),
                monitorParam("port", "3306/db?allowLoadLocalInfile=true&"),
                monitorParam("database", "db"));
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> service.explainQuery(MONITOR_ID, "SELECT 1"));
        assertTrue(exception.getMessage().startsWith("Invalid database port"),
                "unexpected message: " + exception.getMessage());
    }

    @Test
    void cleanConnectionCoordinatesPassTheGuards() {
        stubMonitor(monitorParam("host", "127.0.0.1"),
                monitorParam("username", "root"),
                monitorParam("port", "1"),
                monitorParam("database", "db"));
        // nothing listens on port 1, so the guarded path must fail at the connection step,
        // proving valid coordinates clear every guard and reach DriverManager
        assertThrows(IllegalStateException.class, () -> service.explainQuery(MONITOR_ID, "SELECT 1"));
    }

    private void stubMonitor(Param... params) {
        Monitor monitor = new Monitor();
        monitor.setApp("mysql");
        MonitorDto monitorDto = new MonitorDto();
        monitorDto.setMonitor(monitor);
        monitorDto.setParams(List.of(params), false);
        when(monitorService.getMonitorDto(MONITOR_ID)).thenReturn(monitorDto);
    }

    private Param monitorParam(String field, String value) {
        Param param = new Param();
        param.setField(field);
        param.setParamValue(value);
        return param;
    }
}
