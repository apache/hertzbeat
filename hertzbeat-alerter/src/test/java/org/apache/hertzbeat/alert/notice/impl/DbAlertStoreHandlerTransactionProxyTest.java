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

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.notice.AlertStoreHandler;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Spring AOP contract for the database alert-store transaction boundary.
 */
class DbAlertStoreHandlerTransactionProxyTest {

    @Test
    void storeRunsThroughTheClassBasedTransactionProxy() {
        try (AnnotationConfigApplicationContext context =
                     new AnnotationConfigApplicationContext(TransactionTestConfiguration.class)) {
            AlertStoreHandler storeHandler = context.getBean(AlertStoreHandler.class);
            DbAlertStoreTransaction storeTransaction = context.getBean(DbAlertStoreTransaction.class);
            SingleAlertDao singleAlertDao = context.getBean(SingleAlertDao.class);
            GroupAlertDao groupAlertDao = context.getBean(GroupAlertDao.class);
            AtomicBoolean singleSaveTransactional = new AtomicBoolean();
            AtomicBoolean groupSaveTransactional = new AtomicBoolean();
            when(singleAlertDao.save(any(SingleAlert.class))).thenAnswer(invocation -> {
                singleSaveTransactional.set(TransactionSynchronizationManager.isActualTransactionActive());
                return invocation.getArgument(0);
            });
            when(groupAlertDao.save(any(GroupAlert.class))).thenAnswer(invocation -> {
                groupSaveTransactional.set(TransactionSynchronizationManager.isActualTransactionActive());
                return invocation.getArgument(0);
            });

            SingleAlert alert = SingleAlert.builder()
                    .workspaceId("team-a")
                    .fingerprint("fingerprint")
                    .build();
            GroupAlert group = GroupAlert.builder()
                    .workspaceId("team-a")
                    .groupKey("group")
                    .alerts(List.of(alert))
                    .build();

            storeHandler.store(group);

            assertTrue(AopUtils.isCglibProxy(storeTransaction));
            assertTrue(singleSaveTransactional.get());
            assertTrue(groupSaveTransactional.get());
        }
    }

    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement(proxyTargetClass = true)
    static class TransactionTestConfiguration {

        @Bean
        PlatformTransactionManager transactionManager() {
            return new RecordingTransactionManager();
        }

        @Bean
        SingleAlertDao singleAlertDao() {
            return mock(SingleAlertDao.class);
        }

        @Bean
        GroupAlertDao groupAlertDao() {
            return mock(GroupAlertDao.class);
        }

        @Bean
        DbAlertStoreTransaction dbAlertStoreTransaction(
                GroupAlertDao groupAlertDao, SingleAlertDao singleAlertDao) {
            return new DbAlertStoreTransaction(groupAlertDao, singleAlertDao);
        }

        @Bean
        AlertStoreHandler alertStoreHandler(DbAlertStoreTransaction storeTransaction) {
            return new DbAlertStoreHandlerImpl(storeTransaction);
        }
    }

    private static final class RecordingTransactionManager extends AbstractPlatformTransactionManager {

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            // The base class binds the transaction-active state used by the assertion.
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            // No external resource is needed for this proxy contract.
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            // No external resource is needed for this proxy contract.
        }
    }
}
