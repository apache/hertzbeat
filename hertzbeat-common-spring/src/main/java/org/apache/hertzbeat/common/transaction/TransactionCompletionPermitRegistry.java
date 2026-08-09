/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Binds a writable admission permit to the current physical transaction completion. */
final class TransactionCompletionPermitRegistry {

    private final Object resourceKey = new Object();
    private final SynchronizationRegistrar registrar;
    private final ThreadLocal<Boolean> invocationPermit = new ThreadLocal<>();

    TransactionCompletionPermitRegistry() {
        this(TransactionSynchronizationManager::registerSynchronization);
    }

    TransactionCompletionPermitRegistry(SynchronizationRegistrar registrar) {
        this.registrar = registrar;
    }

    boolean hasPermit() {
        return invocationPermit.get() != null || TransactionSynchronizationManager.hasResource(resourceKey);
    }

    void beginInvocation() {
        invocationPermit.set(Boolean.TRUE);
    }

    void endInvocation() {
        invocationPermit.remove();
    }

    void bind(MetadataWriteAdmissionCoordinator.TransactionPermit permit) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            permit.close();
            throw new IllegalStateException("Transaction synchronization is unavailable");
        }
        boolean bound = false;
        try {
            TransactionSynchronizationManager.bindResource(resourceKey, permit);
            bound = true;
            registrar.register(new PermitReleaseSynchronization(permit));
        } catch (RuntimeException | Error failure) {
            if (bound) {
                TransactionSynchronizationManager.unbindResourceIfPossible(resourceKey);
            }
            permit.close();
            throw failure;
        }
    }

    @FunctionalInterface
    interface SynchronizationRegistrar {

        void register(TransactionSynchronization synchronization);
    }

    private final class PermitReleaseSynchronization implements TransactionSynchronization {

        private final MetadataWriteAdmissionCoordinator.TransactionPermit permit;

        private PermitReleaseSynchronization(MetadataWriteAdmissionCoordinator.TransactionPermit permit) {
            this.permit = permit;
        }

        @Override
        public void afterCompletion(int status) {
            TransactionSynchronizationManager.unbindResourceIfPossible(resourceKey);
            permit.close();
        }
    }
}
