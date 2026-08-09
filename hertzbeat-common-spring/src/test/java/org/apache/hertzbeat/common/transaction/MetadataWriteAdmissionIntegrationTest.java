/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.aop.support.AopUtils;
import org.springframework.aop.framework.Advised;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.interceptor.BeanFactoryTransactionAttributeSourceAdvisor;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = MetadataWriteAdmissionIntegrationTest.TestConfiguration.class)
class MetadataWriteAdmissionIntegrationTest {

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Autowired
    private MetadataWriteAdmissionCoordinator coordinator;

    @Autowired
    private AdmissionService service;

    @Autowired
    private AdmissionRepository repository;

    @Autowired
    private MetadataWriteAdmissionAdvisor admissionAdvisor;

    @Autowired
    private BeanFactoryTransactionAttributeSourceAdvisor transactionAdvisor;

    @AfterEach
    void shutdownExecutor() {
        executor.shutdownNow();
    }

    @BeforeEach
    void clearRows() {
        repository.deleteAll();
    }

    @Test
    void drainWaitsForAdmittedTransactionCommitAndRollbackCompletion() throws Exception {
        CountDownLatch commitStarted = new CountDownLatch(1);
        CountDownLatch finishCommit = new CountDownLatch(1);
        CountDownLatch afterCompletionEntered = new CountDownLatch(1);
        CountDownLatch finishAfterCompletion = new CountDownLatch(1);
        Future<?> write = executor.submit(() -> service.holdWrite(
                commitStarted, finishCommit, afterCompletionEntered, finishAfterCompletion, false));
        assertThat(commitStarted.await(2, TimeUnit.SECONDS)).isTrue();

        Future<MetadataWriteMaintenanceLease> acquiring = executor.submit(
                () -> coordinator.acquire("operation-commit", Duration.ofSeconds(3)));
        awaitPhase(MetadataWriteAdmissionPhase.DRAINING);
        assertThat(acquiring.isDone()).isFalse();
        finishCommit.countDown();
        assertThat(afterCompletionEntered.await(2, TimeUnit.SECONDS)).isTrue();
        assertThat(coordinator.snapshot().activeWritableTransactions()).isEqualTo(1);
        assertThat(acquiring.isDone()).isFalse();
        finishAfterCompletion.countDown();
        write.get(2, TimeUnit.SECONDS);
        try (MetadataWriteMaintenanceLease ignored = acquiring.get(2, TimeUnit.SECONDS)) {
            assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataWriteAdmissionPhase.ACTIVE);
        }
        assertThat(service.count()).isEqualTo(1);

        CountDownLatch rollbackStarted = new CountDownLatch(1);
        CountDownLatch finishRollback = new CountDownLatch(1);
        CountDownLatch rollbackCompletionEntered = new CountDownLatch(1);
        CountDownLatch finishRollbackCompletion = new CountDownLatch(1);
        Future<?> rollback = executor.submit(() -> service.holdWrite(
                rollbackStarted, finishRollback, rollbackCompletionEntered, finishRollbackCompletion, true));
        assertThat(rollbackStarted.await(2, TimeUnit.SECONDS)).isTrue();
        Future<MetadataWriteMaintenanceLease> rollbackDrain = executor.submit(
                () -> coordinator.acquire("operation-rollback", Duration.ofSeconds(3)));
        awaitPhase(MetadataWriteAdmissionPhase.DRAINING);
        finishRollback.countDown();
        assertThat(rollbackCompletionEntered.await(2, TimeUnit.SECONDS)).isTrue();
        assertThat(coordinator.snapshot().activeWritableTransactions()).isEqualTo(1);
        assertThat(rollbackDrain.isDone()).isFalse();
        finishRollbackCompletion.countDown();
        assertThatThrownBy(() -> rollback.get(2, TimeUnit.SECONDS)).isInstanceOf(ExecutionException.class);
        try (MetadataWriteMaintenanceLease ignored = rollbackDrain.get(2, TimeUnit.SECONDS)) {
            assertThat(service.count()).isEqualTo(1);
        }
    }

    @Test
    void drainingAndActiveRejectNewWritesButAllowReadOnlyAndRepositoryTransactions() throws Exception {
        CountDownLatch admitted = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        Future<?> existing = executor.submit(() -> service.holdWrite(admitted, finish, null, null, false));
        assertThat(admitted.await(2, TimeUnit.SECONDS)).isTrue();
        Future<MetadataWriteMaintenanceLease> acquiring = executor.submit(
                () -> coordinator.acquire("operation-gate", Duration.ofSeconds(3)));
        awaitPhase(MetadataWriteAdmissionPhase.DRAINING);

        assertMaintenanceRejection(() -> service.write("draining"));
        assertThat(service.count()).isZero();
        finish.countDown();
        existing.get(2, TimeUnit.SECONDS);

        try (MetadataWriteMaintenanceLease ignored = acquiring.get(2, TimeUnit.SECONDS)) {
            assertMaintenanceRejection(() -> service.write("active"));
            assertMaintenanceRejection(() -> repository.save(new AdmissionRow("repository")));
            assertMaintenanceRejection(() -> repository.deleteById(1L));
            assertThat(repository.count()).isEqualTo(1);
            assertThat(repository.findAll()).hasSize(1);
            assertThat(repository.declaredReadOnly()).hasSize(1);
            assertMaintenanceRejection(repository::declaredWritable);
            assertMaintenanceRejection(service::readOnlyThenNestedWrite);
        }
        service.write("open-again");
        assertThat(service.count()).isEqualTo(2);
    }

    @Test
    void nestedWritableBoundaryReusesOuterThreadPermitWhileDrainStarts() throws Exception {
        CountDownLatch outerAdmitted = new CountDownLatch(1);
        CountDownLatch invokeNested = new CountDownLatch(1);
        Future<?> outer = executor.submit(() -> service.outerThenNested(outerAdmitted, invokeNested));
        assertThat(outerAdmitted.await(2, TimeUnit.SECONDS)).isTrue();
        Future<MetadataWriteMaintenanceLease> acquiring = executor.submit(
                () -> coordinator.acquire("operation-nested", Duration.ofSeconds(3)));
        awaitPhase(MetadataWriteAdmissionPhase.DRAINING);
        invokeNested.countDown();
        outer.get(2, TimeUnit.SECONDS);
        try (MetadataWriteMaintenanceLease ignored = acquiring.get(2, TimeUnit.SECONDS)) {
            assertThat(repository.count()).isEqualTo(2);
        }
    }

    @Test
    void requiredWriteJoinedToReadOnlyOuterTransactionKeepsPermitUntilPhysicalCompletion() throws Exception {
        CountDownLatch nestedReturned = new CountDownLatch(1);
        CountDownLatch finishOuter = new CountDownLatch(1);
        Future<?> outer = executor.submit(() -> service.readOnlyOuterHoldingAfterNestedWrite(
                nestedReturned, finishOuter));
        assertThat(nestedReturned.await(2, TimeUnit.SECONDS)).isTrue();
        assertThat(coordinator.snapshot().activeWritableTransactions()).isEqualTo(1);

        Future<MetadataWriteMaintenanceLease> acquiring = executor.submit(
                () -> coordinator.acquire("operation-read-only-outer", Duration.ofSeconds(3)));
        awaitPhase(MetadataWriteAdmissionPhase.DRAINING);
        assertThat(acquiring.isDone()).isFalse();
        assertThat(coordinator.snapshot().activeWritableTransactions()).isEqualTo(1);

        finishOuter.countDown();
        outer.get(2, TimeUnit.SECONDS);
        try (MetadataWriteMaintenanceLease ignored = acquiring.get(2, TimeUnit.SECONDS)) {
            assertThat(repository.count()).isEqualTo(1);
        }
    }

    @Test
    void timeoutRestoresOpenAndLeaseEpochPreventsStaleOrConcurrentRelease() throws Exception {
        CountDownLatch admitted = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        Future<?> existing = executor.submit(() -> service.holdWrite(admitted, finish, null, null, false));
        assertThat(admitted.await(2, TimeUnit.SECONDS)).isTrue();

        assertThatThrownBy(() -> coordinator.acquire("operation-timeout", Duration.ofMillis(100)))
                .isInstanceOfSatisfying(MetadataWriteAdmissionException.class,
                        error -> assertThat(error.code()).isEqualTo(MetadataWriteAdmissionErrorCode.DRAIN_TIMEOUT));
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataWriteAdmissionPhase.OPEN);
        service.write("accepted-after-timeout");
        finish.countDown();
        existing.get(2, TimeUnit.SECONDS);

        MetadataWriteMaintenanceLease stale = coordinator.acquire("operation-one", Duration.ofSeconds(1));
        assertConflict(() -> coordinator.acquire("operation-one", Duration.ofSeconds(1)));
        assertConflict(() -> coordinator.acquire("operation-other", Duration.ofSeconds(1)));
        stale.close();
        MetadataWriteMaintenanceLease current = coordinator.acquire("operation-two", Duration.ofSeconds(1));
        stale.close();
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataWriteAdmissionPhase.ACTIVE);
        assertThat(coordinator.snapshot().operationId()).isEqualTo("operation-two");
        current.close();
        current.close();
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataWriteAdmissionPhase.OPEN);
    }

    @Test
    void interruptedDrainReopensAdmissionAndTransactionStartFailureDoesNotLeakPermit() throws Exception {
        assertThatThrownBy(service::mandatoryWrite)
                .isInstanceOf(IllegalTransactionStateException.class);
        assertThat(coordinator.snapshot().activeWritableTransactions()).isZero();

        CountDownLatch admitted = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        Future<?> existing = executor.submit(() -> service.holdWrite(admitted, finish, null, null, false));
        assertThat(admitted.await(2, TimeUnit.SECONDS)).isTrue();
        AtomicReference<MetadataWriteAdmissionException> failure = new AtomicReference<>();
        CountDownLatch interrupted = new CountDownLatch(1);
        Future<?> acquiring = executor.submit(() -> {
            try {
                coordinator.acquire("operation-interrupted", Duration.ofSeconds(30));
            } catch (MetadataWriteAdmissionException exception) {
                failure.set(exception);
            } finally {
                interrupted.countDown();
            }
        });
        awaitPhase(MetadataWriteAdmissionPhase.DRAINING);
        acquiring.cancel(true);
        assertThat(interrupted.await(2, TimeUnit.SECONDS)).isTrue();
        assertThat(failure.get().code()).isEqualTo(MetadataWriteAdmissionErrorCode.ACQUISITION_INTERRUPTED);
        assertThat(coordinator.snapshot().phase()).isEqualTo(MetadataWriteAdmissionPhase.OPEN);
        assertThat(coordinator.snapshot().activeWritableTransactions()).isEqualTo(1);
        finish.countDown();
        existing.get(2, TimeUnit.SECONDS);
    }

    @Test
    void validatesOperationAndDurationWithoutLeakingRawFailures() {
        assertInvalid(() -> coordinator.acquire(" ", Duration.ofSeconds(1)));
        assertInvalid(() -> coordinator.acquire("operation", null));
        assertInvalid(() -> coordinator.acquire("operation", Duration.ofSeconds(-1)));
        assertInvalid(() -> coordinator.acquire("operation", Duration.ofSeconds(Long.MAX_VALUE)));

        MetadataWriteMaintenanceLease lease = coordinator.acquire("zero-wait", Duration.ZERO);
        lease.close();
    }

    @Test
    void admissionAdvisorUsesTransactionAttributesAndRunsOutsideTransactionInterceptor() throws Exception {
        assertThat(((Advised) service).getAdvisors()).contains(admissionAdvisor);
        assertThat(admissionAdvisor.getOrder()).isLessThan(transactionAdvisor.getOrder());
        assertThat(admissionAdvisor.getPointcut().getMethodMatcher().matches(
                AdmissionService.class.getMethod("write", String.class), AdmissionService.class)).isTrue();
        assertThat(AopUtils.isAopProxy(repository)).isTrue();
        Advised repositoryProxy = (Advised) repository;
        assertThat(AopUtils.isAopProxy(repositoryProxy.getTargetSource().getTarget())).isFalse();
        assertThat(Arrays.stream(repositoryProxy.getAdvisors())
                .filter(MetadataWriteAdmissionAdvisor.class::isInstance)).hasSize(1);
        assertThat(Arrays.stream(repositoryProxy.getAdvisors())
                .filter(advisor -> advisor.getAdvice() instanceof TransactionInterceptor)).hasSize(1);

        MetadataWriteAdmissionSnapshot observed = service.observeAdmissionInsideTransaction();
        assertThat(observed.phase()).isEqualTo(MetadataWriteAdmissionPhase.OPEN);
        assertThat(observed.activeWritableTransactions()).isEqualTo(1);
    }

    private void awaitPhase(MetadataWriteAdmissionPhase phase) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
        while (coordinator.snapshot().phase() != phase && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(coordinator.snapshot().phase()).isEqualTo(phase);
    }

    private void assertMaintenanceRejection(Runnable write) {
        assertThatThrownBy(write::run)
                .isInstanceOfSatisfying(MetadataWriteAdmissionException.class, error -> {
                    assertThat(error.code()).isEqualTo(MetadataWriteAdmissionErrorCode.MAINTENANCE_ACTIVE);
                    assertThat(error.getMessage()).isEqualTo("Metadata writes are temporarily unavailable");
                    assertThat(error.getCause()).isNull();
                });
    }

    private void assertConflict(ThrowingAcquire acquire) {
        assertThatThrownBy(acquire::run)
                .isInstanceOfSatisfying(MetadataWriteAdmissionException.class,
                        error -> assertThat(error.code()).isEqualTo(MetadataWriteAdmissionErrorCode.OPERATION_CONFLICT));
    }

    private void assertInvalid(ThrowingAcquire acquire) {
        assertThatThrownBy(acquire::run)
                .isInstanceOfSatisfying(MetadataWriteAdmissionException.class,
                        error -> assertThat(error.code()).isEqualTo(MetadataWriteAdmissionErrorCode.INVALID_REQUEST));
    }

    @FunctionalInterface
    private interface ThrowingAcquire {
        void run();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement(order = 200)
    @EnableJpaRepositories(considerNestedRepositories = true,
            basePackageClasses = MetadataWriteAdmissionIntegrationTest.class)
    @Import(MetadataWriteAdmissionConfiguration.class)
    static class TestConfiguration {

        @Bean
        DriverManagerDataSource dataSource() {
            return new DriverManagerDataSource("jdbc:h2:mem:metadata-admission;DB_CLOSE_DELAY=-1", "sa", "");
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DriverManagerDataSource dataSource) {
            LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan(AdmissionRow.class.getPackageName());
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(jakarta.persistence.EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }

        @Bean
        AdmissionNestedWriter nestedWriter(AdmissionRepository repository) {
            return new AdmissionNestedWriter(repository);
        }

        @Bean
        AdmissionService admissionService(
                AdmissionRepository repository,
                AdmissionNestedWriter nestedWriter,
                MetadataWriteAdmissionCoordinator coordinator) {
            return new AdmissionService(repository, nestedWriter, coordinator);
        }
    }

    @Entity(name = "AdmissionRow")
    static class AdmissionRow {

        @Id
        @GeneratedValue
        private Long id;

        private String label;

        protected AdmissionRow() {
        }

        AdmissionRow(String value) {
            this.label = value;
        }
    }

    interface AdmissionRepository extends JpaRepository<AdmissionRow, Long> {

        @Override
        <S extends AdmissionRow> S save(S entity);

        @Override
        void deleteById(Long id);

        @Query("select row from AdmissionRow row")
        @Transactional(readOnly = true)
        List<AdmissionRow> declaredReadOnly();

        @Query("select row from AdmissionRow row")
        @Transactional
        List<AdmissionRow> declaredWritable();
    }

    static class AdmissionNestedWriter {

        private final AdmissionRepository repository;

        AdmissionNestedWriter(AdmissionRepository repository) {
            this.repository = repository;
        }

        @Transactional
        public void write() {
            repository.saveAndFlush(new AdmissionRow("nested"));
        }
    }

    static class AdmissionService {

        private final AdmissionRepository repository;
        private final AdmissionNestedWriter nestedWriter;
        private final MetadataWriteAdmissionCoordinator coordinator;

        AdmissionService(
                AdmissionRepository repository,
                AdmissionNestedWriter nestedWriter,
                MetadataWriteAdmissionCoordinator coordinator) {
            this.repository = repository;
            this.nestedWriter = nestedWriter;
            this.coordinator = coordinator;
        }

        @Transactional
        public void write(String value) {
            repository.saveAndFlush(new AdmissionRow(value));
        }

        @Transactional
        public void holdWrite(
                CountDownLatch admitted,
                CountDownLatch finish,
                CountDownLatch afterCompletionEntered,
                CountDownLatch finishAfterCompletion,
                boolean rollback) {
            repository.saveAndFlush(new AdmissionRow("held"));
            if (afterCompletionEntered != null) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        afterCompletionEntered.countDown();
                        await(finishAfterCompletion);
                    }
                });
            }
            admitted.countDown();
            await(finish);
            if (rollback) {
                throw new IllegalStateException("rollback requested");
            }
        }

        @Transactional
        public void outerThenNested(CountDownLatch admitted, CountDownLatch invokeNested) {
            repository.saveAndFlush(new AdmissionRow("outer"));
            admitted.countDown();
            await(invokeNested);
            nestedWriter.write();
        }

        @Transactional(readOnly = true)
        public long count() {
            return repository.count();
        }

        @Transactional(readOnly = true)
        public void readOnlyThenNestedWrite() {
            nestedWriter.write();
        }

        @Transactional(readOnly = true)
        public void readOnlyOuterHoldingAfterNestedWrite(
                CountDownLatch nestedReturned, CountDownLatch finishOuter) {
            nestedWriter.write();
            nestedReturned.countDown();
            await(finishOuter);
        }

        @Transactional(propagation = Propagation.MANDATORY)
        public void mandatoryWrite() {
            repository.saveAndFlush(new AdmissionRow("mandatory"));
        }

        @Transactional
        public MetadataWriteAdmissionSnapshot observeAdmissionInsideTransaction() {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
            return coordinator.snapshot();
        }

        private static void await(CountDownLatch latch) {
            try {
                if (!latch.await(2, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("test latch timed out");
                }
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("test interrupted", exception);
            }
        }
    }
}
