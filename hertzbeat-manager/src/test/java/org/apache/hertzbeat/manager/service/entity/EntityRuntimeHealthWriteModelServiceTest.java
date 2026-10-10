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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for persisting computed runtime health status onto catalog rows.
 */
@ExtendWith(MockitoExtension.class)
class EntityRuntimeHealthWriteModelServiceTest {

    private EntityRuntimeHealthWriteModelService writeModelService;

    @Mock
    private EntityCoreWriteModelService entityCoreWriteModelService;

    @BeforeEach
    void setUp() {
        writeModelService = new EntityRuntimeHealthWriteModelService(entityCoreWriteModelService);
    }

    @Test
    void persistStatusDelegatesCatalogRowStatusPersistenceToCoreWriteModel() {
        ObserveEntity entity = ObserveEntity.builder()
                .id(42L)
                .type("service")
                .name("checkout-api")
                .status("unknown")
                .build();
        when(entityCoreWriteModelService.persistStatus(entity, "critical")).thenReturn(entity);

        ObserveEntity saved = writeModelService.persistStatus(entity, "critical");

        assertSame(entity, saved);
        assertEquals("unknown", entity.getStatus());
        verify(entityCoreWriteModelService).persistStatus(entity, "critical");
    }
}
