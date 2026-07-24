/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.manager.Define;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.DefineDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.ObjectStoreService;
import org.apache.hertzbeat.manager.service.impl.AppServiceImpl;
import org.apache.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.apache.hertzbeat.warehouse.service.WarehouseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class MonitorDefinitionCommandPortTest {

    private AppServiceImpl appService;
    private MonitorDefinitionCommandService commandService;

    @Mock
    private MonitorDao monitorDao;

    @Mock
    private DefineDao defineDao;

    @Mock
    private ParamDao paramDao;

    @Mock
    private WarehouseService warehouseService;

    @Mock
    private ObjectStoreConfigServiceImpl objectStoreConfigService;

    @Mock
    private ObjectProvider<ObjectStoreService> objectStoreServiceProvider;

    @Mock
    private ObjectProvider<MonitorService> monitorServiceProvider;

    @Mock
    private MonitorService monitorService;

    @BeforeEach
    void setUp() throws Exception {
        when(defineDao.findAll()).thenReturn(new ArrayList<>());
        lenient().when(monitorServiceProvider.getIfAvailable()).thenReturn(monitorService);
        appService = new AppServiceImpl(
                monitorDao,
                objectStoreConfigService,
                paramDao,
                defineDao,
                warehouseService,
                monitorServiceProvider,
                objectStoreServiceProvider);
        commandService = new MonitorDefinitionCommandService(appService);
        appService.afterPropertiesSet();
        clearInvocations(defineDao, monitorDao, monitorService);
    }

    @Test
    void createSucceedsThenConflictsWithoutSecondPersistence() {
        String definition = customDefinition("write-create", "one");

        MonitorDefinitionSource created = commandService.create(definition);

        assertEquals("write-create", created.job().getApp());
        assertEquals(MonitorDefinitionOrigin.CUSTOM, MonitorDefinitionRevision.origin(created));
        assertError(MonitorDefinitionErrorCode.CREATE_CONFLICT, () -> commandService.create(definition));
        verify(defineDao).save(any(Define.class));
        verify(monitorService).updateAppCollectJob(any(Job.class));
    }

    @Test
    void updateRequiresMutableExactIdentityAndCurrentRevision() {
        MonitorDefinitionSource created = commandService.create(customDefinition("write-update", "one"));
        String revision = MonitorDefinitionRevision.from(created);
        String updatedDefinition = customDefinition("write-update", "two");

        MonitorDefinitionSource updated = commandService.update("write-update", revision, updatedDefinition);

        assertEquals(updatedDefinition, updated.definition());
        assertNotEquals(revision, MonitorDefinitionRevision.from(updated));
        assertError(MonitorDefinitionErrorCode.REVISION_CONFLICT,
                () -> commandService.update("write-update", revision, customDefinition("write-update", "three")));
        assertError(MonitorDefinitionErrorCode.UPDATE_TARGET_MISMATCH,
                () -> commandService.update("write-update", MonitorDefinitionRevision.from(updated),
                        customDefinition("different-app", "three")));
        MonitorDefinitionSource builtin = source("jvm");
        assertError(MonitorDefinitionErrorCode.IMMUTABLE,
                () -> commandService.update("jvm", MonitorDefinitionRevision.from(builtin),
                        customDefinition("jvm", "x")));
    }

    @Test
    void deleteCustomOverrideBuiltinInUseAndStaleRevisionAreStable() {
        MonitorDefinitionSource custom = commandService.create(customDefinition("write-delete", "one"));
        assertError(MonitorDefinitionErrorCode.REVISION_CONFLICT,
                () -> commandService.delete("write-delete", "0".repeat(64)));
        when(monitorDao.findMonitorsByAppEquals("write-delete")).thenReturn(List.of(Monitor.builder().id(1L).build()));
        assertError(MonitorDefinitionErrorCode.IN_USE,
                () -> commandService.delete("write-delete", MonitorDefinitionRevision.from(custom)));
        when(monitorDao.findMonitorsByAppEquals("write-delete")).thenReturn(Collections.emptyList());
        assertEquals(MonitorDefinitionDeleteDisposition.REMOVED,
                commandService.delete("write-delete", MonitorDefinitionRevision.from(custom)).disposition());

        MonitorDefinitionSource builtin = source("jvm");
        assertError(MonitorDefinitionErrorCode.IMMUTABLE,
                () -> commandService.delete("jvm", MonitorDefinitionRevision.from(builtin)));

        String overrideDefinition = customDefinition("jvm", "override");
        refresh(List.of(Define.builder().app("jvm").content(overrideDefinition).build()));
        MonitorDefinitionSource override = source("jvm");
        assertEquals(MonitorDefinitionDeleteDisposition.BUILTIN_RESTORED,
                commandService.delete("jvm", MonitorDefinitionRevision.from(override)).disposition());
        assertEquals(MonitorDefinitionOrigin.BUILTIN, MonitorDefinitionRevision.origin(source("jvm")));
    }

    @Test
    void concurrentUpdatesWithSameRevisionAllowExactlyOneWinner() throws InterruptedException {
        MonitorDefinitionSource created = commandService.create(customDefinition("write-race", "initial"));
        String revision = MonitorDefinitionRevision.from(created);
        CountDownLatch start = new CountDownLatch(1);
        List<Object> outcomes = new CopyOnWriteArrayList<>();
        Runnable first = updateAttempt(start, outcomes, revision, "first");
        Runnable second = updateAttempt(start, outcomes, revision, "second");
        Thread one = Thread.startVirtualThread(first);
        Thread two = Thread.startVirtualThread(second);

        start.countDown();
        one.join();
        two.join();

        assertEquals(1, outcomes.stream().filter(MonitorDefinitionSource.class::isInstance).count());
        assertEquals(1, outcomes.stream()
                .filter(MonitorDefinitionErrorCode.REVISION_CONFLICT::equals)
                .count());
    }

    @Test
    void persistenceFailureDoesNotPublishMemoryOrRuntime() {
        String definition = customDefinition("write-persist-fail", "one");
        doThrow(new IllegalStateException("secret persistence detail")).when(defineDao).save(any(Define.class));

        assertError(MonitorDefinitionErrorCode.PERSISTENCE_FAILED, () -> commandService.create(definition));

        assertFalse(appService.readAll().stream()
                .anyMatch(source -> source.job().getApp().equals("write-persist-fail")));
        verify(monitorService, never()).updateAppCollectJob(any(Job.class));
    }

    @Test
    void deletePersistenceFailureKeepsRegistryLegacyStateAndRevision() {
        MonitorDefinitionSource before = commandService.create(customDefinition("write-delete-fail", "one"));
        String revision = MonitorDefinitionRevision.from(before);
        clearInvocations(monitorService);
        doThrow(new IllegalStateException("secret delete detail")).when(defineDao).deleteById("write-delete-fail");

        assertError(MonitorDefinitionErrorCode.PERSISTENCE_FAILED,
                () -> commandService.delete("write-delete-fail", revision));

        MonitorDefinitionSource after = source("write-delete-fail");
        assertEquals(before.definition(), after.definition());
        assertEquals(revision, MonitorDefinitionRevision.from(after));
        assertTrue(appService.getAllAppDefines().containsKey("write-delete-fail"));
        verify(monitorService, never()).updateAppCollectJob(any(Job.class));
    }

    @Test
    void runtimeFailureRollsBackPersistenceRegistryAndLegacyInventory() {
        String definition = customDefinition("write-runtime-fail", "one");
        doThrow(new IllegalStateException("secret runtime detail"))
                .when(monitorService).updateAppCollectJob(any(Job.class));

        assertError(MonitorDefinitionErrorCode.RUNTIME_UPDATE_FAILED, () -> commandService.create(definition));

        verify(defineDao).deleteById("write-runtime-fail");
        assertFalse(appService.getAllAppDefines().containsKey("write-runtime-fail"));
        assertFalse(appService.readAll().stream()
                .anyMatch(source -> source.job().getApp().equals("write-runtime-fail")));
    }

    @Test
    void updateRuntimeFailureRestoresPriorRuntimeAndReadableState() {
        MonitorDefinitionSource previous = commandService.create(customDefinition("write-update-rollback", "one"));
        clearInvocations(monitorService);
        doThrow(new IllegalStateException("first runtime attempt failed"))
                .doNothing()
                .when(monitorService).updateAppCollectJob(any(Job.class));

        assertError(MonitorDefinitionErrorCode.RUNTIME_UPDATE_FAILED,
                () -> commandService.update("write-update-rollback", MonitorDefinitionRevision.from(previous),
                        customDefinition("write-update-rollback", "two")));

        verify(monitorService, times(2)).updateAppCollectJob(any(Job.class));
        assertEquals(previous.definition(), source("write-update-rollback").definition());
    }

    @Test
    void updateRuntimeCompensationFailureReportsStateUncertain() {
        MonitorDefinitionSource previous = commandService.create(customDefinition("write-runtime-uncertain", "one"));
        clearInvocations(monitorService);
        doThrow(new IllegalStateException("new runtime failed"))
                .doThrow(new IllegalStateException("prior runtime restore failed"))
                .when(monitorService).updateAppCollectJob(any(Job.class));

        assertError(MonitorDefinitionErrorCode.STATE_UNCERTAIN,
                () -> commandService.update("write-runtime-uncertain", MonitorDefinitionRevision.from(previous),
                        customDefinition("write-runtime-uncertain", "two")));

        assertEquals(previous.definition(), source("write-runtime-uncertain").definition());
    }

    @Test
    void deleteMonitorLookupFailureUsesSafeStableCode() {
        MonitorDefinitionSource source = commandService.create(customDefinition("write-query-fail", "one"));
        doThrow(new IllegalStateException("secret database failure"))
                .when(monitorDao).findMonitorsByAppEquals("write-query-fail");

        assertError(MonitorDefinitionErrorCode.PERSISTENCE_FAILED,
                () -> commandService.delete("write-query-fail", MonitorDefinitionRevision.from(source)));
    }

    @Test
    void failedCompensationReportsUncertainAndKeepsActuallyPersistedReadableState() {
        String definition = customDefinition("write-uncertain", "one");
        doThrow(new IllegalStateException("secret runtime detail"))
                .when(monitorService).updateAppCollectJob(any(Job.class));
        doThrow(new IllegalStateException("secret compensation detail"))
                .when(defineDao).deleteById("write-uncertain");

        assertError(MonitorDefinitionErrorCode.STATE_UNCERTAIN, () -> commandService.create(definition));

        assertTrue(appService.getAllAppDefines().containsKey("write-uncertain"));
        assertTrue(appService.readAll().stream()
                .anyMatch(source -> source.job().getApp().equals("write-uncertain")));
    }

    private Runnable updateAttempt(CountDownLatch start, List<Object> outcomes, String revision, String suffix) {
        return () -> {
            try {
                start.await();
                outcomes.add(commandService.update("write-race", revision, customDefinition("write-race", suffix)));
            } catch (MonitorDefinitionException error) {
                outcomes.add(error.errorCode());
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
            }
        };
    }

    private String customDefinition(String app, String suffix) {
        return source("jvm").definition().replaceFirst("app: jvm", "app: " + app) + "\n# " + suffix;
    }

    private MonitorDefinitionSource source(String app) {
        return appService.readAll().stream()
                .filter(source -> source.job().getApp().equalsIgnoreCase(app))
                .findFirst()
                .orElseThrow();
    }

    private void refresh(List<Define> definitions) {
        when(defineDao.findAll()).thenReturn(definitions);
        ObjectStoreDTO<Object> config = new ObjectStoreDTO<>();
        config.setType(ObjectStoreDTO.Type.DATABASE);
        appService.onObjectStoreConfigChange(new ObjectStoreConfigChangeEvent(config));
    }

    private static void assertError(MonitorDefinitionErrorCode expected, Runnable action) {
        assertEquals(expected, assertThrows(MonitorDefinitionException.class, action::run).errorCode());
    }
}
