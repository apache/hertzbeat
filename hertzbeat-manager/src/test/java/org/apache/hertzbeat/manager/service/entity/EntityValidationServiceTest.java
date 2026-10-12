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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.junit.jupiter.api.Test;

/**
 * Contract for the entity validation boundary extracted from the large entity service.
 */
class EntityValidationServiceTest {

    private final EntityValidationService validationService = new EntityValidationService();

    @Test
    void validateRejectsMissingEntityAndModifyWithoutId() {
        IllegalArgumentException missing = assertThrows(IllegalArgumentException.class,
                () -> validationService.validate(new EntityDto(), false));
        assertEquals("Entity can not be null.", missing.getMessage());

        EntityDto update = entityDto(ObserveEntity.builder()
                .type("service")
                .name("checkout-api")
                .build());

        IllegalArgumentException missingId = assertThrows(IllegalArgumentException.class,
                () -> validationService.validate(update, true));
        assertEquals("Entity ID can not be null when modify.", missingId.getMessage());
    }

    @Test
    void validateAcceptsSupportedCatalogIdentityAndMonitorBinding() {
        EntityDto entityDto = entityDto(ObserveEntity.builder()
                .id(42L)
                .type("api")
                .name("checkout-api")
                .status("healthy")
                .criticality("critical")
                .build());
        entityDto.setIdentities(List.of(EntityIdentity.builder()
                .identityKey("service.name")
                .identityValue("checkout-api")
                .build()));
        entityDto.setMonitorBinds(List.of(EntityMonitorBind.builder()
                .monitorId(101L)
                .build()));

        assertDoesNotThrow(() -> validationService.validate(entityDto, true));
    }

    @Test
    void validateRejectsUnsupportedCatalogFields() {
        EntityDto unsupportedType = entityDto(ObserveEntity.builder()
                .type("custom_asset")
                .name("checkout-api")
                .build());
        IllegalArgumentException type = assertThrows(IllegalArgumentException.class,
                () -> validationService.validate(unsupportedType, false));
        assertEquals("Unsupported entity type.", type.getMessage());

        EntityDto blankName = entityDto(ObserveEntity.builder()
                .type("service")
                .name(" ")
                .build());
        IllegalArgumentException name = assertThrows(IllegalArgumentException.class,
                () -> validationService.validate(blankName, false));
        assertEquals("Entity name can not be blank.", name.getMessage());

        EntityDto unsupportedStatus = entityDto(ObserveEntity.builder()
                .type("service")
                .name("checkout-api")
                .status("invented")
                .build());
        IllegalArgumentException status = assertThrows(IllegalArgumentException.class,
                () -> validationService.validate(unsupportedStatus, false));
        assertEquals("Unsupported entity status.", status.getMessage());

        EntityDto unsupportedCriticality = entityDto(ObserveEntity.builder()
                .type("service")
                .name("checkout-api")
                .criticality("urgent")
                .build());
        IllegalArgumentException criticality = assertThrows(IllegalArgumentException.class,
                () -> validationService.validate(unsupportedCriticality, false));
        assertEquals("Unsupported entity criticality.", criticality.getMessage());
    }

    @Test
    void validateRejectsBlankIdentityAndMissingMonitorId() {
        EntityDto blankIdentity = entityDto(ObserveEntity.builder()
                .type("service")
                .name("checkout-api")
                .build());
        blankIdentity.setIdentities(List.of(EntityIdentity.builder()
                .identityKey("service.name")
                .identityValue(" ")
                .build()));
        IllegalArgumentException identity = assertThrows(IllegalArgumentException.class,
                () -> validationService.validate(blankIdentity, false));
        assertEquals("Entity identity key and value can not be blank.", identity.getMessage());

        EntityDto missingMonitor = entityDto(ObserveEntity.builder()
                .type("service")
                .name("checkout-api")
                .build());
        missingMonitor.setMonitorBinds(List.of(EntityMonitorBind.builder().build()));
        IllegalArgumentException monitor = assertThrows(IllegalArgumentException.class,
                () -> validationService.validate(missingMonitor, false));
        assertEquals("Monitor bind monitorId can not be null.", monitor.getMessage());
    }

    private EntityDto entityDto(ObserveEntity entity) {
        EntityDto dto = new EntityDto();
        dto.setEntity(entity);
        return dto;
    }
}
