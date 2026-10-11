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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.impl.AlertServiceImpl;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Real H2 proof that scoped status mutations hold their target rows through commit. */
@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@EntityScan(basePackages = "org.apache.hertzbeat.common.entity")
@EnableJpaRepositories(basePackageClasses = SingleAlertDao.class)
@Import(AlertServiceImpl.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AlertServiceStatusConcurrencyTest {

    @Autowired
    private AlertService alertService;

    @Autowired
    private SingleAlertDao singleAlertDao;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockitoBean
    private AlarmCommonReduce alarmCommonReduce;

    @MockitoBean
    private AlertGroupMutationPublisher alertGroupMutationPublisher;

    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    @BeforeEach
    void cleanDatabase() {
        singleAlertDao.deleteAll();
    }

    @AfterEach
    void shutdownExecutor() {
        executor.shutdownNow();
    }

    @Test
    void concurrentDeleteCannotSplitAnExactStatusMutation() throws Exception {
        SingleAlert first = singleAlertDao.saveAndFlush(alert("first"));
        SingleAlert second = singleAlertDao.saveAndFlush(alert("second"));
        List<Long> ids = List.of(first.getId(), second.getId());
        CountDownLatch deleteLocked = new CountDownLatch(1);
        CountDownLatch allowDelete = new CountDownLatch(1);

        Future<Void> delete = executor.submit(() -> {
            new TransactionTemplate(transactionManager).executeWithoutResult(ignored -> {
                assertEquals(1, singleAlertDao.findAllByWorkspaceIdAndIdInForUpdate(
                        "team-a", List.of(second.getId())).size());
                deleteLocked.countDown();
                await(allowDelete);
                singleAlertDao.deleteAllByIdInBatch(List.of(second.getId()));
            });
            return null;
        });
        assertTrue(deleteLocked.await(5, TimeUnit.SECONDS));

        Future<Void> update = executor.submit(() -> {
            alertService.editSingleAlertStatus("team-a", CommonConstants.ALERT_STATUS_RESOLVED, ids);
            return null;
        });
        Thread.sleep(150);
        assertFalse(update.isDone(), "the exact mutation must wait for the concurrent owner-row decision");

        allowDelete.countDown();
        delete.get(5, TimeUnit.SECONDS);
        ExecutionException rejected = org.junit.jupiter.api.Assertions.assertThrows(
                ExecutionException.class, () -> update.get(5, TimeUnit.SECONDS));
        assertTrue(rejected.getCause() instanceof AlertGroupNotFoundException);

        assertEquals(CommonConstants.ALERT_STATUS_FIRING,
                singleAlertDao.findById(first.getId()).orElseThrow().getStatus());
        assertTrue(singleAlertDao.findById(second.getId()).isEmpty());
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("latch_timeout");
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("latch_interrupted", interrupted);
        }
    }

    private static SingleAlert alert(String fingerprint) {
        return SingleAlert.builder()
                .workspaceId("team-a")
                .fingerprint(fingerprint)
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .startAt(1L)
                .triggerTimes(1)
                .build();
    }

    @SpringBootConfiguration(proxyBeanMethods = false)
    static class TestApplication {
    }
}
