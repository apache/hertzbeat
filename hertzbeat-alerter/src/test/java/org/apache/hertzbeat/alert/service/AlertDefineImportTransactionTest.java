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

package org.apache.hertzbeat.alert.service;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.Set;
import org.apache.hertzbeat.alert.calculate.periodic.PeriodicAlertRuleScheduler;
import org.apache.hertzbeat.alert.dao.AlertDefineDao;
import org.apache.hertzbeat.alert.service.impl.AlertDefineJsonImExportServiceImpl;
import org.apache.hertzbeat.alert.service.impl.AlertDefineServiceImpl;
import org.apache.hertzbeat.base.dao.LabelDao;
import org.apache.hertzbeat.base.service.LabelService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"})
@EntityScan(basePackages = "org.apache.hertzbeat.common.entity")
@EnableJpaRepositories(basePackageClasses = AlertDefineDao.class)
@Import({AlertDefineServiceImpl.class, AlertDefineJsonImExportServiceImpl.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AlertDefineImportTransactionTest {

    @SpringBootConfiguration(proxyBeanMethods = false)
    static class TestApplication {
    }

    @Autowired
    private AlertDefineService service;
    @Autowired
    private AlertDefineDao dao;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockitoBean
    private PeriodicAlertRuleScheduler scheduler;
    @MockitoBean
    private LabelService labelService;
    @MockitoBean
    private LabelDao labelDao;
    @MockitoBean
    private DataSourceService dataSourceService;

    @Test
    void duplicateNameRollsBackEarlierImportWithoutSchedulingIt() {
        dao.saveAndFlush(AlertDefine.builder().name("existing").build());
        MockMultipartFile file = rulesFile("""
                [{"alertDefine":{"name":"rolled-back","type":"periodic_metric","expr":"up","period":60,"enable":true}},
                 {"alertDefine":{"name":"existing","type":"periodic_metric","expr":"up","period":60,"enable":true}}]
                """);

        IllegalArgumentException failure = assertThrows(IllegalArgumentException.class, () -> service.importConfig(file));

        assertEquals("alert name already exists", failure.getMessage());
        assertTrue(dao.findAlertDefineByName("rolled-back").isEmpty());
        verifyNoInteractions(scheduler);
    }

    @Test
    void invalidPeriodIsRejectedBeforeTheImportCommits() {
        MockMultipartFile file = rulesFile("""
                [{"alertDefine":{"name":"invalid-period","type":"periodic_metric","period":0,"enable":true}}]
                """);

        assertThrows(IllegalArgumentException.class, () -> service.importConfig(file));
        assertTrue(dao.findAlertDefineByName("invalid-period").isEmpty());
        verifyNoInteractions(scheduler);
    }

    @Test
    void periodicRuleIsScheduledOnlyAfterCommit() {
        MockMultipartFile file = rulesFile("""
                [{"alertDefine":{"name":"committed","type":"periodic_metric","expr":"up","period":60,"enable":true}}]
                """);
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            assertDoesNotThrow(() -> service.importConfig(file));
            verifyNoInteractions(scheduler);
        });

        Long id = dao.findAlertDefineByName("committed").orElseThrow().getId();
        verify(scheduler).updateSchedule(argThat(saved -> saved.getId().equals(id)));
    }

    @Test
    void committedEditSchedulesTheNewPeriod() {
        AlertDefine rule = dao.saveAndFlush(AlertDefine.builder().name("edited")
                .type("periodic_metric").period(60).enable(true).build());
        Long id = rule.getId();
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            rule.setPeriod(30);
            service.modifyAlertDefine(rule);
            verifyNoInteractions(scheduler);
        });

        assertEquals(30, dao.findById(id).orElseThrow().getPeriod());
        verify(scheduler).updateSchedule(argThat(saved -> id.equals(saved.getId()) && saved.getPeriod() == 30));
    }

    @Test
    void rolledBackChangesLeaveExistingSchedulesAlone() {
        AlertDefine first = dao.saveAndFlush(AlertDefine.builder().name("original").type("periodic_metric").period(60).build());
        AlertDefine second = dao.saveAndFlush(AlertDefine.builder().name("second").build());
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            first.setPeriod(30);
            service.modifyAlertDefine(first);
            service.deleteAlertDefine(first.getId());
            service.deleteAlertDefines(Set.of(second.getId()));
            status.setRollbackOnly();
        });

        assertEquals(60, dao.findById(first.getId()).orElseThrow().getPeriod());
        assertTrue(dao.existsById(second.getId()));
        verifyNoInteractions(scheduler);
    }

    @Test
    void committedDeletesCancelEachSchedule() {
        AlertDefine first = dao.saveAndFlush(AlertDefine.builder().name("delete-one").build());
        AlertDefine second = dao.saveAndFlush(AlertDefine.builder().name("delete-many").build());
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            service.deleteAlertDefine(first.getId());
            service.deleteAlertDefines(Set.of(second.getId()));
            verifyNoInteractions(scheduler);
        });

        verify(scheduler).cancelSchedule(first.getId());
        verify(scheduler).cancelSchedule(second.getId());
    }

    private static MockMultipartFile rulesFile(String json) {
        return new MockMultipartFile("file", "rules.json", "application/json", json.getBytes(UTF_8));
    }
}
