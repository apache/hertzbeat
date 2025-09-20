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

package org.apache.hertzbeat.manager.service;

import org.apache.hertzbeat.alert.dao.AlertDefineDao;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link AlertDefineService}
 */
public class AlertDefineServiceIntegrationTest extends AbstractSpringIntegrationTest {

    @Autowired
    private AlertDefineService alertDefineService;
    @Autowired
    private AlertDefineDao alertDefineDao;

    private List<Long> createdIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        createdIds.clear();
    }

    @AfterEach
    void tearDown() {
        for (Long id : createdIds) {
            if (alertDefineDao.existsById(id)) {
                alertDefineDao.deleteById(id);
            }
        }
    }

    @Test
    void testAddAlertDefine() {
        AlertDefine alertDefine = AlertDefine.builder()
                .name("test-cpu-alert")
                .expr("usage > 80")
                .times(3)
                .type("periodic")
                .enable(true)
                .period(10)
                .template("CPU usage is excessively high: ${usage}%")
                .creator("integration-test")
                .modifier("integration-test")
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .build();
        assertNull(alertDefine.getId());
        assertDoesNotThrow(() -> alertDefineService.addAlertDefine(alertDefine));

        assertNotNull(alertDefine.getId());
        assertTrue(alertDefine.getId() > 0);

        createdIds.add(alertDefine.getId());

        AlertDefine savedAlertDefine = alertDefineDao.findById(alertDefine.getId()).orElse(null);
        assertNotNull(savedAlertDefine);
        assertEquals("usage > 80", savedAlertDefine.getExpr());
        assertEquals("integration-test", savedAlertDefine.getCreator());
    }

    @Test
    void testModifyAlertDefine() {
        AlertDefine alertDefine = AlertDefine.builder()
                .name("test-cpu-alert")
                .expr("usage > 80")
                .times(3)
                .type("periodic")
                .enable(true)
                .period(10)
                .template("CPU usage is excessively high: ${usage}%")
                .creator("integration-test")
                .modifier("integration-test")
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .build();
        assertNull(alertDefine.getId());
        assertDoesNotThrow(() -> alertDefineService.modifyAlertDefine(alertDefine));

        assertNotNull(alertDefine.getId());
        assertTrue(alertDefine.getId() > 0);

        createdIds.add(alertDefine.getId());

        AlertDefine savedAlertDefine = alertDefineDao.findById(alertDefine.getId()).orElse(null);
        assertNotNull(savedAlertDefine);
        assertEquals("usage > 80", savedAlertDefine.getExpr());
        assertEquals("integration-test", savedAlertDefine.getCreator());
    }

}