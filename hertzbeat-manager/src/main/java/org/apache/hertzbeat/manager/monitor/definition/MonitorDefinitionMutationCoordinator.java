/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Serializes definition mutations and keeps migrations isolated until their transaction completes.
 * Spring invokes transaction synchronizations on the completing transaction thread, preserving lock ownership.
 */
@Component
public class MonitorDefinitionMutationCoordinator implements MonitorDefinitionMigrationExecutor {

    private final ReentrantLock lock = new ReentrantLock();

    public void execute(Runnable mutation) {
        execute(() -> {
            mutation.run();
            return null;
        });
    }

    public <T> T execute(Supplier<T> mutation) {
        lock.lock();
        try {
            return mutation.get();
        } finally {
            lock.unlock();
        }
    }

    @Override
    public void executeMigration(Runnable migration) {
        lock.lock();
        boolean releaseImmediately = true;
        try {
            migration.run();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        lock.unlock();
                    }
                });
                releaseImmediately = false;
            }
        } finally {
            if (releaseImmediately) {
                lock.unlock();
            }
        }
    }
}
