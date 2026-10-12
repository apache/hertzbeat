/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.common.observability.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.junit.jupiter.api.Test;
import org.apache.hertzbeat.common.util.JsonUtil;

class ObservedEntityContextTest {

    @Test
    void fromShouldPreserveEntityAndIdentities() {
        ObserveEntity entity = ObserveEntity.builder().id(1L).name("checkout").build();
        List<EntityIdentity> identities = List.of(EntityIdentity.builder()
                .entityId(1L)
                .identityKey("service.name")
                .identityValue("checkout")
                .build());

        ObservedEntityContext context = ObservedEntityContext.from(entity, identities);

        assertSame(entity, context.getEntity());
        assertEquals(identities, context.getIdentities());
    }

    @Test
    void fromWithHertzbeatShouldCopyMetadata() {
        ObserveEntity entity = ObserveEntity.builder().id(2L).name("payment").build();
        var hertzbeat = JsonUtil.fromJson("{\"codeLocations\":[{\"repositoryURL\":\"https://github.com/apache/hertzbeat\"}]}");

        ObservedEntityContext context = ObservedEntityContext.from(entity, List.of(), hertzbeat);

        assertEquals(hertzbeat, context.getHertzbeat());
    }
}
