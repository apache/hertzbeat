/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class TransactionCompletionPermitRegistryTest {

    @AfterEach
    void clearTransactionState() {
        TransactionSynchronizationManager.clear();
    }

    @Test
    void synchronizationRegistrationFailureReleasesPermitAndResource() {
        MetadataWriteAdmissionCoordinator coordinator = new MetadataWriteAdmissionCoordinator();
        TransactionCompletionPermitRegistry registry = new TransactionCompletionPermitRegistry(synchronization -> {
            throw new IllegalStateException("registration failed");
        });
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        MetadataWriteAdmissionCoordinator.TransactionPermit permit = coordinator.admitWritableTransaction();

        assertThatThrownBy(() -> registry.bind(permit)).isInstanceOf(IllegalStateException.class);

        assertThat(registry.hasPermit()).isFalse();
        assertThat(coordinator.snapshot().activeWritableTransactions()).isZero();
    }
}
