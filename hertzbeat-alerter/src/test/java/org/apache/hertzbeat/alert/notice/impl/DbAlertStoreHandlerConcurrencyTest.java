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

package org.apache.hertzbeat.alert.notice.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.EntityManagerFactory;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.notice.AlertStoreHandler;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.DefaultTransactionStatus;

/** Real H2 proof that one scoped fingerprint is serialized through transaction commit. */
@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@EntityScan(basePackages = "org.apache.hertzbeat.common.entity")
@EnableJpaRepositories(basePackageClasses = {SingleAlertDao.class, GroupAlertDao.class})
@Import({
    DbAlertStoreHandlerImpl.class,
    DbAlertStoreTransaction.class,
    DbAlertStoreHandlerConcurrencyTest.TransactionConfiguration.class
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class DbAlertStoreHandlerConcurrencyTest {

    @Autowired
    private AlertStoreHandler storeHandler;

    @Autowired
    private SingleAlertDao singleAlertDao;

    @Autowired
    private GroupAlertDao groupAlertDao;

    @Autowired
    private BlockingJpaTransactionManager transactionManager;

    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    @BeforeEach
    void cleanDatabase() {
        groupAlertDao.deleteAll();
        singleAlertDao.deleteAll();
    }

    @AfterEach
    void shutDown() {
        executor.shutdownNow();
    }

    @Test
    void sameWorkspaceFingerprintCannotRaceBetweenLockReleaseAndCommit() throws Exception {
        transactionManager.blockNextCommit();
        Future<GroupAlert> first = executor.submit(() -> store(group("first")));
        assertTrue(transactionManager.awaitBlockedCommit(Duration.ofSeconds(5)));

        Future<GroupAlert> second = executor.submit(() -> store(group("second")));
        Thread.sleep(150);
        assertFalse(second.isDone(), "the contender must remain serialized until the first commit");

        transactionManager.releaseCommit();
        first.get(5, TimeUnit.SECONDS);
        try {
            second.get(5, TimeUnit.SECONDS);
        } catch (ExecutionException failure) {
            throw new AssertionError("the contender crossed the commit boundary", failure.getCause());
        }

        List<SingleAlert> alerts = singleAlertDao.findAll();
        assertEquals(1, alerts.size());
        assertEquals(2, alerts.getFirst().getTriggerTimes());
    }

    @Test
    void outerRollbackKeepsScopedLocksUntilCompletionAndPersistsNothing() throws Exception {
        CountDownLatch storeReturned = new CountDownLatch(1);
        CountDownLatch finishOuter = new CountDownLatch(1);
        Future<Void> first = executor.submit(() -> {
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                store(group("rolled-back"));
                storeReturned.countDown();
                await(finishOuter);
                status.setRollbackOnly();
            });
            return null;
        });
        assertTrue(storeReturned.await(5, TimeUnit.SECONDS));

        Future<GroupAlert> second = executor.submit(() -> store(group("committed")));
        Thread.sleep(150);
        assertFalse(second.isDone(), "the contender must wait for the outer transaction completion");

        finishOuter.countDown();
        first.get(5, TimeUnit.SECONDS);
        second.get(5, TimeUnit.SECONDS);

        List<SingleAlert> alerts = singleAlertDao.findAll();
        assertEquals(1, alerts.size());
        assertEquals("committed", alerts.getFirst().getContent());
        assertEquals(1, alerts.getFirst().getTriggerTimes());
    }

    private GroupAlert store(GroupAlert groupAlert) {
        return storeHandler.store(groupAlert);
    }

    private static GroupAlert group(String suffix) {
        SingleAlert alert = SingleAlert.builder()
                .workspaceId("team-a")
                .fingerprint("shared-fingerprint")
                .status("firing")
                .startAt(1L)
                .triggerTimes(1)
                .content(suffix)
                .build();
        return GroupAlert.builder()
                .workspaceId("team-a")
                .groupKey("shared-group")
                .alerts(List.of(alert))
                .build();
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

    @SpringBootConfiguration(proxyBeanMethods = false)
    static class TransactionConfiguration {

        @Bean
        @Primary
        BlockingJpaTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
            return new BlockingJpaTransactionManager(entityManagerFactory);
        }
    }

    static final class BlockingJpaTransactionManager extends JpaTransactionManager {

        private final AtomicBoolean blockNextCommit = new AtomicBoolean();
        private volatile CountDownLatch commitEntered = new CountDownLatch(1);
        private volatile CountDownLatch allowCommit = new CountDownLatch(1);

        BlockingJpaTransactionManager(EntityManagerFactory entityManagerFactory) {
            super(entityManagerFactory);
        }

        void blockNextCommit() {
            commitEntered = new CountDownLatch(1);
            allowCommit = new CountDownLatch(1);
            blockNextCommit.set(true);
        }

        boolean awaitBlockedCommit(Duration timeout) throws InterruptedException {
            return commitEntered.await(timeout.toMillis(), TimeUnit.MILLISECONDS);
        }

        void releaseCommit() {
            allowCommit.countDown();
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            if (blockNextCommit.compareAndSet(true, false)) {
                commitEntered.countDown();
                try {
                    if (!allowCommit.await(5, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("commit_release_timeout");
                    }
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("commit_interrupted", interrupted);
                }
            }
            super.doCommit(status);
        }
    }
}
