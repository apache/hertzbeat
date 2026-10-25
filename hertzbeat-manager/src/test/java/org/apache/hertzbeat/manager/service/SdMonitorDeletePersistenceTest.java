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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.sql.DataSource;
import org.apache.hertzbeat.alert.dao.AlertDefineBindDao;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.MonitorBind;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.service.impl.MonitorServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactoryBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;

class SdMonitorDeletePersistenceTest {
    private DataSource dataSource;
    private LocalContainerEntityManagerFactoryBean factory;
    private TransactionTemplate transaction;
    private EntityManager entityManager;
    private DefaultListableBeanFactory beans;
    private MonitorDao monitors;
    private ParamDao parameters;
    private MonitorBindDao bindings;
    private MonitorService service;
    private final MetricsFavoriteService favorites = mock(MetricsFavoriteService.class);
    private final CollectJobScheduling scheduling = mock(CollectJobScheduling.class);

    @BeforeEach
    void setUp() {
        dataSource = new DriverManagerDataSource("jdbc:h2:mem:sd_delete_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", "");
        factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setManagedTypes(PersistenceManagedTypes.of(Monitor.class.getName(), Param.class.getName(), MonitorBind.class.getName()));
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(Map.of(
                "hibernate.hbm2ddl.auto", "create-drop",
                "hibernate.hbm2ddl.halt_on_error", "true",
                "hibernate.physical_naming_strategy", "org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImpl"));
        factory.afterPropertiesSet();
        JpaTransactionManager manager = new JpaTransactionManager(factory.getObject());
        transaction = new TransactionTemplate(manager);
        entityManager = SharedEntityManagerCreator.createSharedEntityManager(factory.getObject());
        beans = new DefaultListableBeanFactory();
        beans.registerSingleton("transactionManager", manager);
        monitors = repository(MonitorDao.class);
        parameters = repository(ParamDao.class);
        bindings = repository(MonitorBindDao.class);

        MonitorServiceImpl target = new MonitorServiceImpl();
        ReflectionTestUtils.setField(target, "monitorDao", monitors);
        ReflectionTestUtils.setField(target, "paramDao", parameters);
        ReflectionTestUtils.setField(target, "monitorBindDao", bindings);
        ReflectionTestUtils.setField(target, "alertDefineBindDao", mock(AlertDefineBindDao.class));
        ReflectionTestUtils.setField(target, "collectorMonitorBindDao", mock(CollectorMonitorBindDao.class));
        ReflectionTestUtils.setField(target, "metricsFavoriteService", favorites);
        ReflectionTestUtils.setField(target, "collectJobScheduling", scheduling);
        ReflectionTestUtils.setField(target, "applicationContext", mock(ApplicationContext.class));
        TransactionInterceptor advice = new TransactionInterceptor();
        advice.setTransactionManager(manager);
        advice.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        advice.afterPropertiesSet();
        ProxyFactory proxy = new ProxyFactory(target);
        proxy.addAdvice(advice);
        service = (MonitorService) proxy.getProxy();

        transaction.executeWithoutResult(status -> {
            monitors.saveAll(List.of(monitor(1), monitor(2), monitor(3), monitor(4)));
            parameters.saveAll(List.of(parameter(1), parameter(2), parameter(3), parameter(4)));
            bindings.saveAll(List.of(binding(1, 2), binding(3, 4)));
        });
    }

    @AfterEach
    void tearDown() {
        if (factory != null) {
            factory.destroy();
        }
        if (dataSource != null) {
            new JdbcTemplate(dataSource).execute("SHUTDOWN");
        }
    }

    @Test
    void deletingSdParentDeletesChildParametersAndPreservesOtherTree() {
        service.deleteMonitors(Set.of(1L));
        assertRows(Set.of(3L, 4L));
        assertEquals(Set.of("3:4"), bindingPairs());
        verify(scheduling).cancelAsyncCollectJob(101L);
        verify(scheduling).cancelAsyncCollectJob(102L);
    }

    @Test
    void singleDeleteEntryPointHasSameParentChildScope() {
        service.deleteMonitor(1L);
        assertRows(Set.of(3L, 4L));
        assertEquals(Set.of("3:4"), bindingPairs());
    }

    @Test
    void deletingOnlyChildPreservesParentParameters() {
        service.deleteMonitors(Set.of(2L));
        assertRows(Set.of(1L, 3L, 4L));
        assertEquals(Set.of("3:4"), bindingPairs());
    }

    @Test
    void deletingBothParentsDeletesBothTreesParameters() {
        service.deleteMonitors(Set.of(1L, 3L));
        assertRows(Set.of());
        assertEquals(Set.of(), bindingPairs());
    }

    @Test
    void missingRequestedMonitorDoesNotDeleteOrphanParameters() {
        transaction.executeWithoutResult(status -> parameters.save(parameter(99)));
        service.deleteMonitors(Set.of(1L, 99L));
        assertEquals(Set.of(3L, 4L), transaction.execute(status -> monitors.findAll().stream()
                .map(Monitor::getId).collect(Collectors.toSet())));
        assertEquals(Set.of(3L, 4L, 99L), transaction.execute(status -> parameters.findAll().stream()
                .map(Param::getMonitorId).collect(Collectors.toSet())));
    }

    @Test
    void staleAndNullChildBindingsDoNotExpandParameterDeletionBeyondExistingMonitors() {
        transaction.executeWithoutResult(status -> {
            parameters.save(parameter(99));
            Param unbound = parameter(99);
            unbound.setMonitorId(null);
            parameters.save(unbound);
            MonitorBind nullChild = binding(1, 99);
            nullChild.setMonitorId(null);
            bindings.saveAll(List.of(binding(1, 99), nullChild));
        });
        service.deleteMonitors(Set.of(1L));
        assertEquals(Set.of(3L, 4L), transaction.execute(status -> monitors.findAll().stream()
                .map(Monitor::getId).collect(Collectors.toSet())));
        assertEquals(Set.of(3L, 4L, 99L), transaction.execute(status -> parameters.findAll().stream()
                .map(Param::getMonitorId).filter(java.util.Objects::nonNull).collect(Collectors.toSet())));
        Long unboundCount = transaction.execute(status -> parameters.findAll().stream()
                .filter(param -> param.getMonitorId() == null).count());
        assertEquals(Long.valueOf(1), unboundCount);
    }

    @Test
    void failureAfterDeletesRollsBackMonitorsParametersAndBindings() {
        doThrow(new IllegalStateException("fixture late cleanup failure")).when(favorites).deleteFavoritesByMonitorIdIn(anySet());
        assertThrows(IllegalStateException.class, () -> service.deleteMonitors(Set.of(1L)));
        assertRows(Set.of(1L, 2L, 3L, 4L));
        assertEquals(Set.of("1:2", "3:4"), bindingPairs());
    }

    @Test
    void emptySelectionDoesNotChangeData() {
        service.deleteMonitors(Set.of());
        assertRows(Set.of(1L, 2L, 3L, 4L));
        assertEquals(Set.of("1:2", "3:4"), bindingPairs());
    }

    private void assertRows(Set<Long> expected) {
        assertEquals(expected, transaction.execute(status -> monitors.findAll().stream().map(Monitor::getId).collect(Collectors.toSet())));
        assertEquals(expected, transaction.execute(status -> parameters.findAll().stream().map(Param::getMonitorId).collect(Collectors.toSet())));
    }

    private Set<String> bindingPairs() {
        return transaction.execute(status -> bindings.findAll().stream()
                .map(bind -> bind.getBizId() + ":" + bind.getMonitorId()).collect(Collectors.toSet()));
    }

    private <E, R extends JpaRepository<E, Long>> R repository(Class<R> type) {
        JpaRepositoryFactoryBean<R, E, Long> bean = new JpaRepositoryFactoryBean<>(type);
        bean.setBeanFactory(beans);
        bean.setEntityManager(entityManager);
        bean.afterPropertiesSet();
        return bean.getObject();
    }

    private Monitor monitor(long id) {
        Monitor monitor = new Monitor();
        monitor.setId(id);
        monitor.setJobId(100 + id);
        monitor.setName("fixture-" + id);
        monitor.setApp("linux");
        return monitor;
    }

    private Param parameter(long monitorId) {
        Param param = new Param();
        param.setMonitorId(monitorId);
        param.setField("fixture-field");
        param.setParamValue("synthetic-value");
        param.setType((byte) 1);
        return param;
    }

    private MonitorBind binding(long parent, long child) {
        MonitorBind bind = new MonitorBind();
        bind.setBizId(parent);
        bind.setMonitorId(child);
        return bind;
    }
}
