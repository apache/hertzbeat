/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import lombok.extern.slf4j.Slf4j;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Copies custom monitor definitions to a target and switches only after exact verification. */
@Service
@Slf4j
public class MonitorDefinitionStorageMigrationService {

    private final MonitorDefinitionSourceReader sourceReader;
    private final MonitorDefinitionMigrationExecutor migrationExecutor;
    private final MonitorDefinitionStoreFactory storeFactory;

    public MonitorDefinitionStorageMigrationService(
            MonitorDefinitionSourceReader sourceReader,
            MonitorDefinitionMigrationExecutor migrationExecutor,
            MonitorDefinitionStoreFactory storeFactory) {
        this.sourceReader = sourceReader;
        this.migrationExecutor = migrationExecutor;
        this.storeFactory = storeFactory;
    }

    public void migrate(ObjectStoreDTO<ObjectStoreDTO.ObsConfig> current,
                        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> target) {
        if (Objects.equals(current, target)) {
            return;
        }
        migrationExecutor.executeMigration(() -> copyToTarget(target));
    }

    private void copyToTarget(ObjectStoreDTO<ObjectStoreDTO.ObsConfig> target) {
        Map<String, String> definitions = customDefinitions();
        if (definitions.isEmpty()) {
            return;
        }
        MonitorDefinitionStore targetStore = storeFactory.open(target);
        List<String> created = new ArrayList<>();
        try {
            Map<String, String> targetDefinitions = targetStore.loadAll();
            List<String> conflicts = definitions.entrySet().stream()
                    .filter(entry -> targetDefinitions.containsKey(entry.getKey())
                            && !entry.getValue().equals(targetDefinitions.get(entry.getKey())))
                    .map(Map.Entry::getKey)
                    .toList();
            if (!conflicts.isEmpty()) {
                throw new MonitorDefinitionMigrationConflictException(conflicts);
            }
            for (var entry : definitions.entrySet()) {
                if (!targetDefinitions.containsKey(entry.getKey())) {
                    targetStore.save(entry.getKey(), entry.getValue());
                    created.add(entry.getKey());
                }
            }
            Map<String, String> verifiedDefinitions = targetStore.loadAll();
            for (var entry : definitions.entrySet()) {
                if (!entry.getValue().equals(verifiedDefinitions.get(entry.getKey()))) {
                    throw new IllegalStateException("monitor definition migration verification failed");
                }
            }
            completeWithTransaction(targetStore, created);
        } catch (RuntimeException | Error error) {
            try {
                compensate(targetStore, created);
            } catch (RuntimeException compensationFailure) {
                error.addSuppressed(compensationFailure);
            }
            close(targetStore, error);
            throw error;
        }
    }

    private Map<String, String> customDefinitions() {
        Map<String, String> definitions = new LinkedHashMap<>();
        sourceReader.readAll().stream()
                .filter(MonitorDefinitionSource::custom)
                .forEach(source -> definitions.put(
                        MonitorDefinitionIdentity.normalize(source.job().getApp()), source.definition()));
        return definitions;
    }

    private void completeWithTransaction(MonitorDefinitionStore targetStore, List<String> created) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            targetStore.close();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    try {
                        compensate(targetStore, created);
                    } catch (RuntimeException error) {
                        log.error("Monitor definition migration compensation failed: {}",
                                error.getClass().getSimpleName());
                    }
                }
                try {
                    targetStore.close();
                } catch (RuntimeException error) {
                    log.warn("Monitor definition migration target close failed: {}",
                            error.getClass().getSimpleName());
                }
            }
        });
    }

    private void compensate(MonitorDefinitionStore targetStore, List<String> created) {
        RuntimeException failure = null;
        for (int index = created.size() - 1; index >= 0; index--) {
            try {
                targetStore.delete(created.get(index));
            } catch (RuntimeException error) {
                if (failure == null) {
                    failure = error;
                } else {
                    failure.addSuppressed(error);
                }
            }
        }
        if (failure != null) {
            throw failure;
        }
    }

    private void close(MonitorDefinitionStore targetStore, Throwable original) {
        try {
            targetStore.close();
        } catch (RuntimeException closeFailure) {
            original.addSuppressed(closeFailure);
        }
    }
}
