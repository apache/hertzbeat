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
