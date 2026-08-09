/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionAdvisor;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionCoordinator;
import org.apache.hertzbeat.manager.component.sd.ServiceDiscoveryWorker;
import org.apache.hertzbeat.manager.component.status.CalculateStatus;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceCoordinator;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceParticipant;
import org.apache.hertzbeat.manager.maintenance.AlertMetadataMaintenanceParticipant;
import org.apache.hertzbeat.manager.maintenance.CollectorLifecycleMaintenanceParticipant;
import org.apache.hertzbeat.manager.setup.runtime.SetupRuntimeTransition;
import org.apache.hertzbeat.warehouse.store.DataStorageDispatch;
import org.apache.hertzbeat.warehouse.store.metadata.JdbcMonitorStatusMetadataWriter;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.Advised;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.interceptor.BeanFactoryTransactionAttributeSourceAdvisor;
import org.springframework.transaction.interceptor.TransactionAttribute;
import org.springframework.transaction.interceptor.TransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;

/** Full application context proof for the metadata write admission advisor chain. */
@ActiveProfiles("test")
@SpringBootTest(classes = HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.NONE)
class MetadataWriteAdmissionStartupContextTest {

    @Autowired
    private ApplicationContext context;

    @MockitoBean
    private SetupRuntimeTransition setupRuntimeTransition;

    @Test
    void startupHasOneAdmissionBoundaryAndOneTransactionSource() throws Exception {
        assertThat(context.getBeansOfType(MetadataMaintenanceCoordinator.class)).hasSize(1);
        List<MetadataMaintenanceParticipant> participants = context.getBeanProvider(
                MetadataMaintenanceParticipant.class).orderedStream().toList();
        assertThat(participants)
                .containsExactly(
                        context.getBean(ServiceDiscoveryWorker.class),
                        context.getBean(CalculateStatus.class),
                        context.getBean(CollectorLifecycleMaintenanceParticipant.class),
                        context.getBean(AlertMetadataMaintenanceParticipant.class));
        assertThat(participants).noneMatch(DataStorageDispatch.class::isInstance);

        assertThat(context.getBeansOfType(MetadataWriteAdmissionCoordinator.class)).hasSize(1);
        assertThat(context.getBeansOfType(MetadataWriteAdmissionAdvisor.class)).hasSize(1);
        assertThat(context.getBeansOfType(TransactionAttributeSource.class)).hasSize(1);
        MetadataWriteAdmissionAdvisor admissionAdvisor = context.getBean(MetadataWriteAdmissionAdvisor.class);
        BeanFactoryTransactionAttributeSourceAdvisor transactionAdvisor =
                context.getBean(BeanFactoryTransactionAttributeSourceAdvisor.class);
        assertThat(admissionAdvisor.getOrder()).isLessThan(transactionAdvisor.getOrder());

        JdbcMonitorStatusMetadataWriter writer = context.getBean(JdbcMonitorStatusMetadataWriter.class);
        assertThat(AopUtils.isAopProxy(writer)).isTrue();
        assertThat(writer).isInstanceOf(Advised.class);
        Advised advised = (Advised) writer;
        assertThat(Arrays.stream(advised.getAdvisors())
                .filter(MetadataWriteAdmissionAdvisor.class::isInstance)).hasSize(1);
        assertThat(Arrays.stream(advised.getAdvisors())
                .filter(advisor -> advisor.getAdvice() instanceof TransactionInterceptor)).hasSize(1);
        assertThat(Arrays.asList(advised.getAdvisors()).indexOf(admissionAdvisor))
                .isLessThan(transactionAdvisorIndex(advised));

        assertThat(AopUtils.isAopProxy(context.getBean(DataStorageDispatch.class))).isFalse();

        MonitorDao repository = context.getBean(MonitorDao.class);
        assertThat(repository).isInstanceOf(Advised.class);
        Advised repositoryProxy = (Advised) repository;
        assertThat(repositoryProxy.getTargetSource().getTarget()).isInstanceOf(SimpleJpaRepository.class);
        assertThat(AopUtils.isAopProxy(repositoryProxy.getTargetSource().getTarget())).isFalse();
        assertThat(Arrays.stream(repositoryProxy.getAdvisors())
                .filter(MetadataWriteAdmissionAdvisor.class::isInstance)).hasSize(1);
        assertThat(Arrays.stream(repositoryProxy.getAdvisors())
                .filter(advisor -> advisor.getAdvice() instanceof TransactionInterceptor)).hasSize(1);
        assertThat(admissionAdvisorIndex(repositoryProxy)).isLessThan(transactionAdvisorIndex(repositoryProxy));

        TransactionInterceptor repositoryTransactionInterceptor = transactionInterceptor(repositoryProxy);
        TransactionAttributeSource repositoryAttributes =
                repositoryTransactionInterceptor.getTransactionAttributeSource();
        Class<?> repositoryTargetClass = AopUtils.getTargetClass(repositoryProxy.getTargetSource().getTarget());
        assertRepositoryReadOnly(repositoryAttributes, repositoryTargetClass,
                MonitorDao.class.getMethod("findAll"), true);
        assertRepositoryReadOnly(repositoryAttributes, repositoryTargetClass,
                MonitorDao.class.getMethod("save", Object.class), false);
        assertRepositoryReadOnly(repositoryAttributes, repositoryTargetClass,
                MonitorDao.class.getMethod("deleteById", Object.class), false);
    }

    private int admissionAdvisorIndex(Advised advised) {
        for (int index = 0; index < advised.getAdvisors().length; index++) {
            if (advised.getAdvisors()[index] instanceof MetadataWriteAdmissionAdvisor) {
                return index;
            }
        }
        return -1;
    }

    private int transactionAdvisorIndex(Advised advised) {
        for (int index = 0; index < advised.getAdvisors().length; index++) {
            if (advised.getAdvisors()[index].getAdvice() instanceof TransactionInterceptor) {
                return index;
            }
        }
        return -1;
    }

    private TransactionInterceptor transactionInterceptor(Advised advised) {
        return (TransactionInterceptor) advised.getAdvisors()[transactionAdvisorIndex(advised)].getAdvice();
    }

    private void assertRepositoryReadOnly(
            TransactionAttributeSource attributes,
            Class<?> targetClass,
            Method interfaceMethod,
            boolean expectedReadOnly) {
        TransactionAttribute attribute = attributes.getTransactionAttribute(interfaceMethod, targetClass);
        assertThat(attribute).isNotNull();
        assertThat(attribute.isReadOnly()).isEqualTo(expectedReadOnly);
    }
}
