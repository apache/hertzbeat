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

package org.apache.hertzbeat.manager.dao;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import jakarta.annotation.Resource;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.apache.hertzbeat.manager.pojo.dto.AppCount;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

/**
 * Test case for {@link MonitorDao}
 */
@Transactional
class MonitorDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private MonitorDao monitorDao;

    @BeforeEach
    void setUp() {
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .app("jvm")
                .name("jvm_test")
                .host("192.34.5.43")
                .status((byte) 1)
                .build();
        monitor = monitorDao.saveAndFlush(monitor);
        assertNotNull(monitor);
    }

    @AfterEach
    void tearDown() {
        monitorDao.deleteAll();
    }

    @Test
    void deleteAllByIdIn() {
        Set<Long> ids = new HashSet<>();
        ids.add(1L);
        assertDoesNotThrow(() -> monitorDao.deleteAllByIdIn(ids));
    }

    @Test
    void findMonitorsByIdIn() {
        Set<Long> ids = new HashSet<>();
        ids.add(1L);
        List<Monitor> monitors = monitorDao.findMonitorsByIdIn(ids);
        assertNotNull(monitors);
        assertEquals(1, monitors.size());
    }

    @Test
    void findMonitorsByAppEquals() {
        List<Monitor> monitors = monitorDao.findMonitorsByAppEquals("jvm");
        assertNotNull(monitors);
        assertEquals(1, monitors.size());
        monitors = monitorDao.findMonitorsByAppEquals("mysql");
        assertTrue(monitors.isEmpty());
    }

    @Test
    void findMonitorsByStatusNotInAndJobIdNotNull() {
        List<Byte> bytes = Arrays.asList((byte) 2, (byte) 3);
        List<Monitor> monitors = monitorDao.findMonitorsByStatusNotInAndJobIdNotNull(bytes);
        assertNotNull(monitors);
        assertEquals(1, monitors.size());
    }

    @Test
    void findMonitorByNameEquals() {
        Optional<Monitor> monitorOptional = monitorDao.findMonitorByNameEquals("jvm_test");
        assertTrue(monitorOptional.isPresent());
    }

    @Test
    void findAppsStatusCount() {
        List<AppCount> appCounts = monitorDao.findAppsStatusCount();
        assertNotNull(appCounts);
        assertFalse(appCounts.isEmpty());
    }

    @Test
    void updateMonitorStatus() {
        Optional<Monitor> monitorOptional = monitorDao.findById(1L);
        assertTrue(monitorOptional.isPresent());
        assertEquals((byte) 1, monitorOptional.get().getStatus());
        monitorDao.updateMonitorStatus(1L, (byte) 0);
        monitorOptional = monitorDao.findById(1L);
        assertTrue(monitorOptional.isPresent());
        assertEquals((byte) 0, monitorOptional.get().getStatus());
    }
}
