/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class MonitorDefinitionStorageMigrationServiceTest {

    @Mock
    private MonitorDefinitionSourceReader sourceReader;
    @Mock
    private MonitorDefinitionMigrationExecutor migrationExecutor;
    @Mock
    private MonitorDefinitionStoreFactory storeFactory;
    @Mock
    private MonitorDefinitionStore targetStore;

    private MonitorDefinitionStorageMigrationService migrationService;

    @BeforeEach
    void setUp() {
        migrationService = new MonitorDefinitionStorageMigrationService(sourceReader, migrationExecutor, storeFactory);
        lenient().doAnswer(invocation -> {
            invocation.getArgument(0, Runnable.class).run();
            return null;
        }).when(migrationExecutor).executeMigration(any());
    }

    @Test
    void copiesOnlyCustomDefinitionsAndVerifiesTheTargetBeforeReturning() {
        when(sourceReader.readAll()).thenReturn(List.of(
                source("mysql", "custom-mysql", true),
                source("redis", "builtin-redis", false),
                source("kafka", "same-kafka", true)));
        when(storeFactory.open(target())).thenReturn(targetStore);
        when(targetStore.loadAll()).thenReturn(
                Map.of("kafka", "same-kafka"),
                Map.of("mysql", "custom-mysql", "kafka", "same-kafka"));

        migrationService.migrate(source(), target());

        verify(targetStore).save("mysql", "custom-mysql");
        verify(targetStore, never()).save("redis", "builtin-redis");
        verify(targetStore, never()).save("kafka", "same-kafka");
        verify(targetStore, times(2)).loadAll();
        verify(targetStore, never()).load(any());
        verify(targetStore).close();
    }

    @Test
    void rejectsEveryWriteWhenTheTargetContainsDifferentContentForTheSameApp() {
        when(sourceReader.readAll()).thenReturn(List.of(
                source("mysql", "custom-mysql", true),
                source("kafka", "source-kafka", true)));
        when(storeFactory.open(target())).thenReturn(targetStore);
        when(targetStore.loadAll()).thenReturn(Map.of("kafka", "target-kafka"));

        MonitorDefinitionMigrationConflictException error = assertThrows(
                MonitorDefinitionMigrationConflictException.class,
                () -> migrationService.migrate(source(), target()));

        assertEquals(List.of("kafka"), error.apps());
        verify(targetStore, never()).save(any(), any());
        verify(targetStore).close();
    }

    @Test
    void removesOnlyObjectsCreatedByTheFailedAttempt() {
        when(sourceReader.readAll()).thenReturn(List.of(
                source("mysql", "custom-mysql", true),
                source("kafka", "custom-kafka", true)));
        when(storeFactory.open(target())).thenReturn(targetStore);
        when(targetStore.loadAll()).thenReturn(Map.of());
        doAnswer(invocation -> {
            if ("kafka".equals(invocation.getArgument(0))) {
                throw new IllegalStateException("target unavailable");
            }
            return null;
        }).when(targetStore).save(any(), any());

        assertThrows(IllegalStateException.class, () -> migrationService.migrate(source(), target()));

        verify(targetStore).delete("mysql");
        verify(targetStore, never()).delete("kafka");
        verify(targetStore).close();
    }

    @Test
    void skipsMigrationWhenTheEffectiveStorageConfigurationDidNotChange() {
        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> current = source();

        migrationService.migrate(current, current);

        verify(migrationExecutor, never()).executeMigration(any());
        verify(storeFactory, never()).open(any());
    }

    @Test
    void switchesWithoutOpeningTheTargetWhenThereAreNoCustomDefinitions() {
        when(sourceReader.readAll()).thenReturn(List.of(source("redis", "builtin-redis", false)));

        migrationService.migrate(source(), target());

        verify(storeFactory, never()).open(any());
    }

    @Test
    void transactionRollbackRemovesCopiedDefinitionsAndKeepsTheSourceIntact() {
        when(sourceReader.readAll()).thenReturn(List.of(source("mysql", "custom-mysql", true)));
        when(storeFactory.open(target())).thenReturn(targetStore);
        when(targetStore.loadAll()).thenReturn(Map.of(), Map.of("mysql", "custom-mysql"));
        TransactionSynchronizationManager.initSynchronization();
        try {
            migrationService.migrate(source(), target());

            verify(targetStore, never()).close();
            TransactionSynchronizationManager.getSynchronizations().getFirst()
                    .afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);

            verify(targetStore).delete("mysql");
            verify(targetStore).close();
            verify(sourceReader).readAll();
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private MonitorDefinitionSource source(String app, String definition, boolean custom) {
        Job job = new Job();
        job.setApp(app);
        return new MonitorDefinitionSource(job, definition, true, custom);
    }

    private ObjectStoreDTO<ObjectStoreDTO.ObsConfig> source() {
        return new ObjectStoreDTO<>(ObjectStoreDTO.Type.DATABASE, null);
    }

    private ObjectStoreDTO<ObjectStoreDTO.ObsConfig> target() {
        return new ObjectStoreDTO<>(ObjectStoreDTO.Type.FILE, null);
    }
}
