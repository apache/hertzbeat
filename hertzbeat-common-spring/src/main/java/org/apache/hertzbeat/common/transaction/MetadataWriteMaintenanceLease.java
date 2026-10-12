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

import java.util.concurrent.atomic.AtomicBoolean;

/** Capability that returns metadata write admission to OPEN when its matching epoch is released. */
public final class MetadataWriteMaintenanceLease implements AutoCloseable {

    private final MetadataWriteAdmissionCoordinator coordinator;
    private final String operationId;
    private final long epoch;
    private final Object token;
    private final AtomicBoolean closed = new AtomicBoolean();

    MetadataWriteMaintenanceLease(
            MetadataWriteAdmissionCoordinator coordinator, String operationId, long epoch, Object token) {
        this.coordinator = coordinator;
        this.operationId = operationId;
        this.epoch = epoch;
        this.token = token;
    }

    @Override
    public void close() {
        if (closed.compareAndSet(false, true)) {
            coordinator.release(operationId, epoch, token);
        }
    }
}
