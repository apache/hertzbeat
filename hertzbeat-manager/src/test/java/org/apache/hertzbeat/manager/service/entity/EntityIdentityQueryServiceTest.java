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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.manager.dao.EntityIdentityDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for raw persisted identity rows, counts, and match lookup.
 */
@ExtendWith(MockitoExtension.class)
class EntityIdentityQueryServiceTest {

    @InjectMocks
    private EntityIdentityQueryService entityIdentityQueryService;

    @Mock
    private EntityIdentityDao entityIdentityDao;

    @Test
    void findIdentitiesKeepsPersistedPriorityOrder() {
        EntityIdentity serviceIdentity = EntityIdentity.builder()
                .id(901L)
                .entityId(801L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .priority(100)
                .build();
        when(entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(801L))
                .thenReturn(List.of(serviceIdentity));

        List<EntityIdentity> identities = entityIdentityQueryService.findIdentities(801L);

        assertEquals(List.of(serviceIdentity), identities);
        verify(entityIdentityDao).findAllByEntityIdOrderByPriorityDescIdAsc(801L);
    }

    @Test
    void countIdentitiesUsesPersistedRowsOnly() {
        when(entityIdentityDao.countByEntityId(801L)).thenReturn(2L);

        long count = entityIdentityQueryService.countIdentities(801L);

        assertEquals(2L, count);
        verify(entityIdentityDao).countByEntityId(801L);
    }

    @Test
    void findMatchingIdentitiesUsesPersistedKeysAndNormalizedValues() {
        EntityIdentity serviceIdentity = EntityIdentity.builder()
                .id(902L)
                .entityId(802L)
                .identityKey("service.name")
                .identityValue("checkout-api")
                .normalizedValue("checkout-api")
                .priority(90)
                .build();
        Set<String> keys = Set.of("service.name");
        Set<String> values = Set.of("checkout-api");
        when(entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(keys, values))
                .thenReturn(List.of(serviceIdentity));

        List<EntityIdentity> identities = entityIdentityQueryService.findMatchingIdentities(keys, values);

        assertEquals(List.of(serviceIdentity), identities);
        verify(entityIdentityDao).findAllByIdentityKeyInAndNormalizedValueIn(keys, values);
    }
}
