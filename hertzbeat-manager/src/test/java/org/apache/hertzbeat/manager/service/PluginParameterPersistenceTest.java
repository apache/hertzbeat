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

import jakarta.persistence.EntityManager;
import javax.sql.DataSource;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.UUID;
import java.util.function.Supplier;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.plugin.PluginContext;
import org.apache.hertzbeat.plugin.PostCollectPlugin;
import org.apache.hertzbeat.common.entity.manager.PluginMetadata;
import org.apache.hertzbeat.manager.dao.PluginItemDao;
import org.apache.hertzbeat.manager.dao.PluginMetadataDao;
import org.apache.hertzbeat.manager.dao.PluginParamDao;
import org.apache.hertzbeat.manager.pojo.dto.PluginParam;
import org.apache.hertzbeat.manager.service.impl.PluginServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.h2.jdbcx.JdbcConnectionPool;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactoryBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Exercises parameter replacement and rollback with the production entity/repository and real H2 transactions. */
public class PluginParameterPersistenceTest {

    private LocalContainerEntityManagerFactoryBean entityManagerFactory;
    private DataSource dataSource;
    private TransactionTemplate transaction;
    private PluginParamDao parameters;
    private EntityManager entityManager;
    private PluginServiceImpl service;
    private PluginMetadataDao metadata;

    @TempDir
    private Path temporaryDirectory;
    private Map<Long, Object> cacheBefore;
    private Map<String, Boolean> enabledBefore;
    private Map<String, Long> itemsBefore;
    private Map<Long, Object> definitionsBefore;
    private URLClassLoader fixtureLoader;

    @BeforeEach
    void setUp(TestInfo testInfo) throws Exception {
        cacheBefore = new HashMap<>(parameterCache());
        enabledBefore = new HashMap<>(enabledPlugins());
        itemsBefore = new HashMap<>(pluginItems());
        definitionsBefore = new HashMap<>(parameterDefinitions());
        String url = "jdbc:h2:mem:plugin_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
        if (testInfo.getTestMethod().orElseThrow().getName().equals("cacheMissDoesNotBlockCommitWithOneConnection")) {
            JdbcConnectionPool pool = JdbcConnectionPool.create(url, "sa", "");
            pool.setMaxConnections(1);
            pool.setLoginTimeout(5);
            dataSource = pool;
        } else {
            dataSource = new DriverManagerDataSource(url, "sa", "");
        }
        entityManagerFactory = new LocalContainerEntityManagerFactoryBean();
        entityManagerFactory.setDataSource(dataSource);
        entityManagerFactory.setManagedTypes(PersistenceManagedTypes.of(PluginParam.class.getName()));
        entityManagerFactory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        entityManagerFactory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
        entityManagerFactory.afterPropertiesSet();
        var factory = entityManagerFactory.getObject();
        var manager = new JpaTransactionManager(factory);
        transaction = new TransactionTemplate(manager);
        var beans = new DefaultListableBeanFactory();
        beans.registerSingleton("transactionManager", manager);
        var repository = new JpaRepositoryFactoryBean<PluginParamDao, PluginParam, Long>(PluginParamDao.class);
        repository.setBeanFactory(beans);
        entityManager = SharedEntityManagerCreator.createSharedEntityManager(factory);
        repository.setEntityManager(entityManager);
        repository.afterPropertiesSet();
        parameters = repository.getObject();
        metadata = mock(PluginMetadataDao.class);
        service = new PluginServiceImpl(metadata, mock(PluginItemDao.class), parameters);
        Path descriptor = temporaryDirectory.resolve("META-INF/services/" + PostCollectPlugin.class.getName());
        Files.createDirectories(descriptor.getParent());
        Files.writeString(descriptor, ParameterConsumer.class.getName());
        installRuntimeFixture();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (fixtureLoader != null) {
            fixtureLoader.close();
        }
        if (entityManagerFactory != null) {
            entityManagerFactory.destroy();
        }
        if (dataSource != null) {
            new JdbcTemplate(dataSource).execute("SHUTDOWN");
            if (dataSource instanceof JdbcConnectionPool pool) {
                pool.dispose();
            }
        }
        parameterCache().clear();
        parameterCache().putAll(cacheBefore);
        enabledPlugins().clear();
        enabledPlugins().putAll(enabledBefore);
        pluginItems().clear();
        pluginItems().putAll(itemsBefore);
        parameterDefinitions().clear();
        parameterDefinitions().putAll(definitionsBefore);
    }

    @Test
    void editingAnExistingFieldReplacesItsCommittedValue() {
        save(List.of(parameter(901L, "normal", "old")));
        save(List.of(parameter(902L, "normal", "unrelated")));

        assertDoesNotThrow(() -> save(List.of(parameter(901L, "normal", "new"))));

        assertEquals(List.of("new"), values(901L));
        assertEquals(List.of("unrelated"), values(902L));
        assertEquals(List.of(new Configmap("normal", "new", (byte) 1)), runtimeParameters());
    }

    @Test
    void failedInsertionRollsBackDeletionAndPreservesPreviousValues() {
        save(List.of(parameter(901L, "normal", "old")));
        Map<Long, Object> beforeFailure = new HashMap<>(parameterCache());

        var failure = assertThrows(ConstraintViolationException.class, () -> save(List.of(
                parameter(901L, "normal", "new"), parameter(901L, "normal", "duplicate"))));
        assertEquals("23505", failure.getSQLState());

        assertEquals(List.of("old"), values(901L));
        assertEquals(beforeFailure, parameterCache());
    }

    @Test
    void failureAfterServiceReturnsRollsBackDatabaseWithoutPublishingParameters() {
        save(List.of(parameter(901L, "normal", "old")));
        IllegalStateException outerFailure = new IllegalStateException("Outer transaction failed");

        assertSame(outerFailure, assertThrows(IllegalStateException.class,
                () -> transaction.executeWithoutResult(status -> {
                    service.savePluginParam(List.of(parameter(901L, "normal", "new")));
                    assertEquals(List.of("new"), values(901L));
                    throw outerFailure;
                })));

        assertEquals(List.of("old"), values(901L));
        assertEquals(List.of(new Configmap("normal", "old", (byte) 1)), runtimeParameters());
    }

    @Test
    void successfulTransactionPublishesParametersOnlyAfterCommit() {
        save(List.of(parameter(901L, "normal", "old")));

        transaction.executeWithoutResult(status -> {
            service.savePluginParam(List.of(parameter(901L, "normal", "new")));
            assertEquals(List.of("new"), values(901L));
            assertEquals(List.of(new Configmap("normal", "old", (byte) 1)), runtimeParameters());
        });

        assertEquals(List.of("new"), values(901L));
        assertEquals(List.of(new Configmap("normal", "new", (byte) 1)), runtimeParameters());
    }

    @Test
    void publicationUsesDetachedValuesWhenCallerChangesTheInputAfterSave() {
        PluginParam param = parameter(901L, "normal", "new");
        List<PluginParam> input = new ArrayList<>(List.of(param));

        transaction.executeWithoutResult(status -> {
            service.savePluginParam(input);
            entityManager.detach(param);
            param.setField("changed");
            param.setParamValue("changed");
            param.setType((byte) 2);
            input.clear();
        });

        assertEquals(List.of("new"), values(901L));
        assertEquals(List.of(new Configmap("normal", "new", (byte) 1)), runtimeParameters());
    }

    @Test
    void twoSavesInOneTransactionPublishTheLastCommittedParameters() {
        save(List.of(parameter(901L, "normal", "old")));

        transaction.executeWithoutResult(status -> {
            service.savePluginParam(List.of(parameter(901L, "normal", "first")));
            service.savePluginParam(List.of(parameter(901L, "normal", "latest")));
            assertEquals(List.of("latest"), values(901L));
            assertEquals(List.of(new Configmap("normal", "old", (byte) 1)), runtimeParameters());
        });

        assertEquals(List.of("latest"), values(901L));
        assertEquals(List.of(new Configmap("normal", "latest", (byte) 1)), runtimeParameters());
    }

    @Test
    void deletingPluginParametersThenRollingBackPreservesCommittedCache() throws Exception {
        save(List.of(parameter(901L, "normal", "old")));
        PluginMetadata plugin = new PluginMetadata();
        plugin.setId(901L);
        plugin.setJarFilePath(temporaryDirectory.resolve("absent-plugin.jar").toString());
        when(metadata.findAllById(Set.of(901L))).thenReturn(List.of(plugin));
        when(metadata.findById(901L)).thenReturn(Optional.of(plugin));
        IllegalStateException outerFailure = new IllegalStateException("Outer deletion failed");

        assertSame(outerFailure, assertThrows(IllegalStateException.class,
                () -> transaction.executeWithoutResult(status -> {
                    service.deletePlugins(Set.of(901L));
                    parameters.flush();
                    assertEquals(List.of(), values(901L));
                    throw outerFailure;
                })));

        assertEquals(List.of("old"), values(901L));
        installRuntimeFixture();
        assertEquals(List.of(new Configmap("normal", "old", (byte) 1)), runtimeParameters());
    }

    @Test
    void delayedEarlierCommitCannotOverwriteNewerCommittedParameters() throws Exception {
        save(List.of(parameter(901L, "normal", "old")));
        CountDownLatch firstDatabaseCommit = new CountDownLatch(1);
        CountDownLatch resumeFirstCallback = new CountDownLatch(1);

        try (var executor = Executors.newSingleThreadExecutor()) {
            var first = executor.submit(() -> transaction.executeWithoutResult(status -> {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        firstDatabaseCommit.countDown();
                        try {
                            assertTrue(resumeFirstCallback.await(10, TimeUnit.SECONDS), "Newer save did not release callback");
                        } catch (InterruptedException exception) {
                            Thread.currentThread().interrupt();
                            throw new IllegalStateException(exception);
                        }
                    }
                });
                service.savePluginParam(List.of(parameter(901L, "normal", "first")));
            }));
            try {
                assertTrue(firstDatabaseCommit.await(10, TimeUnit.SECONDS), "First database transaction did not commit");
                assertEquals(List.of("first"), values(901L));
                save(List.of(parameter(901L, "normal", "newest")));
                assertEquals(List.of("newest"), values(901L));
                assertEquals(List.of(new Configmap("normal", "newest", (byte) 1)), runtimeParameters());
            } finally {
                resumeFirstCallback.countDown();
            }
            first.get(10, TimeUnit.SECONDS);
        }

        assertEquals(List.of("newest"), values(901L));
        assertEquals(List.of(new Configmap("normal", "newest", (byte) 1)), runtimeParameters());
    }

    @Test
    void committedDeletionInvalidatesParametersConsumedByPlugins() throws Exception {
        save(List.of(parameter(901L, "normal", "old")));
        prepareDeletion();
        transaction.executeWithoutResult(status -> service.deletePlugins(Set.of(901L)));
        installRuntimeFixture();
        assertEquals(List.of(), values(901L));
        assertEquals(List.of(), runtimeParameters());
    }

    @Test
    void ambientTransactionCacheMissNeverPublishesUncommittedParameters() {
        save(List.of(parameter(901L, "normal", "old")));
        parameterCache().remove(901L);
        transaction.executeWithoutResult(status -> {
            service.savePluginParam(List.of(parameter(901L, "normal", "uncommitted")));
            assertEquals(List.of(new Configmap("normal", "uncommitted", (byte) 1)), runtimeParameters());
            assertFalse(parameterCache().containsKey(901L));
            status.setRollbackOnly();
        });
        assertEquals(List.of(new Configmap("normal", "old", (byte) 1)), runtimeParameters());
    }

    @Test
    void oldInFlightReadCannotReplaceSlotCreatedAfterCommitInvalidation() throws Exception {
        save(List.of(parameter(901L, "normal", "old")));
        parameterCache().remove(901L);
        CountDownLatch oldRead = new CountDownLatch(1);
        CountDownLatch releaseOldRead = new CountDownLatch(1);
        PluginParamDao observed = observeReads(() -> {
            List<PluginParam> result = parameters.findParamsByPluginMetadataId(901L);
            if (Thread.currentThread().getName().equals("old-parameter-reader")) {
                oldRead.countDown();
                await(releaseOldRead);
            }
            return result;
        });
        service = new PluginServiceImpl(metadata, mock(PluginItemDao.class), observed);
        installRuntimeFixture();
        try (var executor = Executors.newSingleThreadExecutor(task -> new Thread(task, "old-parameter-reader"))) {
            var old = executor.submit(this::runtimeParameters);
            try {
                assertTrue(oldRead.await(10, TimeUnit.SECONDS));
                save(List.of(parameter(901L, "normal", "new")));
                assertEquals(List.of(new Configmap("normal", "new", (byte) 1)), runtimeParameters());
            } finally {
                releaseOldRead.countDown();
            }
            // An invocation already in flight may finish using its own snapshot, but cannot poison future invocations.
            assertEquals(List.of(new Configmap("normal", "old", (byte) 1)), old.get(10, TimeUnit.SECONDS));
        }
        assertEquals(List.of(new Configmap("normal", "new", (byte) 1)), runtimeParameters());
    }

    @Test
    void cacheMissDoesNotBlockCommitWithOneConnection() throws Exception {
        save(List.of(parameter(901L, "normal", "old")));
        parameterCache().remove(901L);
        CountDownLatch writerReady = new CountDownLatch(1);
        CountDownLatch allowCommit = new CountDownLatch(1);
        CountDownLatch readerEntered = new CountDownLatch(1);
        PluginParamDao observed = observeReads(() -> {
            readerEntered.countDown();
            return parameters.findParamsByPluginMetadataId(901L);
        });
        service = new PluginServiceImpl(metadata, mock(PluginItemDao.class), observed);
        installRuntimeFixture();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var writer = executor.submit(() -> transaction.executeWithoutResult(status -> {
                service.savePluginParam(List.of(parameter(901L, "normal", "new")));
                writerReady.countDown();
                await(allowCommit);
            }));
            try {
                assertTrue(writerReady.await(10, TimeUnit.SECONDS));
                var reader = executor.submit(this::runtimeParameters);
                assertTrue(readerEntered.await(10, TimeUnit.SECONDS));
                assertFalse(reader.isDone(), "The writer still owns the pool's only connection");
                allowCommit.countDown();
                writer.get(10, TimeUnit.SECONDS);
                assertEquals(List.of(new Configmap("normal", "new", (byte) 1)), reader.get(10, TimeUnit.SECONDS));
            } finally {
                allowCommit.countDown();
            }
        }
        assertEquals(List.of(new Configmap("normal", "new", (byte) 1)), runtimeParameters());
    }

    @Test
    void lazyLoadingPreservesParameterValuesAndTypes() {
        List<PluginParam> params = List.of(parameter(901L, "number", "42"), parameter(901L, "text", "value"),
                parameter(901L, "password", "********"), parameter(901L, "json", "{\"key\":\"value\"}"));
        params.get(0).setType((byte) 0);
        params.get(2).setType((byte) 2);
        params.get(3).setType((byte) 3);
        save(params);
        assertEquals(params.stream().map(param -> new Configmap(param.getField(), param.getParamValue(), param.getType()))
                .sorted(Comparator.comparing(Configmap::getKey)).toList(), runtimeParameters());
    }

    @Test
    void failedReadRemovesItsMarkerAndSuccessfulReadIsCached() throws Exception {
        save(List.of(parameter(901L, "normal", "old")));
        parameterCache().remove(901L);
        AtomicInteger reads = new AtomicInteger();
        PluginParamDao observed = observeReads(() -> {
            if (reads.incrementAndGet() == 1) {
                throw new IllegalStateException("Controlled read failure");
            }
            return parameters.findParamsByPluginMetadataId(901L);
        });
        service = new PluginServiceImpl(metadata, mock(PluginItemDao.class), observed);
        installRuntimeFixture();
        assertThrows(IllegalStateException.class, this::runtimeParameters);
        assertFalse(parameterCache().containsKey(901L));
        assertEquals(List.of(new Configmap("normal", "old", (byte) 1)), runtimeParameters());
        assertEquals(List.of(new Configmap("normal", "old", (byte) 1)), runtimeParameters());
        assertEquals(2, reads.get(), "The ready cache entry avoids a third database read");
    }

    private PluginParamDao observeReads(Supplier<List<PluginParam>> read) {
        // Only control read timing/failure; all persistence operations still reach the real Spring Data repository.
        return (PluginParamDao) Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[]{PluginParamDao.class}, (proxy, method, args) -> {
            if (method.getName().equals("findParamsByPluginMetadataId") && Long.valueOf(901L).equals(args[0])) {
                return read.get();
            }
            try {
                return method.invoke(parameters, args);
            } catch (InvocationTargetException exception) {
                throw exception.getCause();
            }
        });
    }

    private void prepareDeletion() {
        PluginMetadata plugin = new PluginMetadata();
        plugin.setId(901L);
        plugin.setJarFilePath(temporaryDirectory.resolve("absent-plugin.jar").toString());
        when(metadata.findAllById(Set.of(901L))).thenReturn(List.of(plugin));
        when(metadata.findById(901L)).thenReturn(Optional.of(plugin));
    }

    private void await(CountDownLatch latch) {
        try {
            assertTrue(latch.await(10, TimeUnit.SECONDS), "Timed out waiting for controlled interleaving");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private void save(List<PluginParam> params) {
        // Matches the service's @Transactional boundary while sharing the real repository persistence context.
        transaction.executeWithoutResult(status -> service.savePluginParam(params));
        runtimeParameters();
    }

    private List<String> values(Long pluginId) {
        return parameters.findParamsByPluginMetadataId(pluginId).stream().map(PluginParam::getParamValue).toList();
    }

    private PluginParam parameter(Long pluginId, String field, String value) {
        return PluginParam.builder().pluginMetadataId(pluginId).field(field).paramValue(value).type((byte) 1).build();
    }

    @SuppressWarnings("unchecked")
    private Map<Long, Object> parameterCache() {
        return (Map<Long, Object>) ReflectionTestUtils.getField(PluginServiceImpl.class, "PARAMS_MAP");
    }

    @SuppressWarnings("unchecked")
    private Map<Long, Object> parameterDefinitions() {
        return (Map<Long, Object>) ReflectionTestUtils.getField(PluginServiceImpl.class, "PARAMS_CONFIG_MAP");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Boolean> enabledPlugins() {
        return (Map<String, Boolean>) ReflectionTestUtils.getField(PluginServiceImpl.class, "PLUGIN_ENABLE_STATUS");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Long> pluginItems() {
        return (Map<String, Long>) ReflectionTestUtils.getField(PluginServiceImpl.class, "ITEM_TO_PLUGINMETADATAID_MAP");
    }

    @SuppressWarnings("unchecked")
    private void installRuntimeFixture() throws Exception {
        if (fixtureLoader != null) {
            fixtureLoader.close();
        }
        fixtureLoader = new URLClassLoader(new URL[]{temporaryDirectory.toUri().toURL()}, getClass().getClassLoader());
        List<URLClassLoader> loaders = (List<URLClassLoader>) ReflectionTestUtils.getField(service, "pluginClassLoaders");
        loaders.clear();
        loaders.add(fixtureLoader);
        enabledPlugins().put(ParameterConsumer.class.getName(), true);
        pluginItems().put(ParameterConsumer.class.getName(), 901L);
    }

    private List<Configmap> runtimeParameters() {
        AtomicReference<List<Configmap>> consumed = new AtomicReference<>();
        service.pluginExecute(PostCollectPlugin.class, (plugin, context) -> consumed.set(context.param().allParams().stream().sorted(Comparator.comparing(Configmap::getKey)).toList()));
        assertNotNull(consumed.get(), "Scoped service provider must receive a real PluginContext");
        return consumed.get();
    }

    /** Service provider registered only in this test's temporary class loader. */
    public static class ParameterConsumer implements PostCollectPlugin {
        @Override
        public void execute(CollectRep.MetricsData metricsData, PluginContext context) {
            // The service's execution callback captures this provider's context in the fixture.
        }
    }

}
