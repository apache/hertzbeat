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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps entity detail loading and observability assembly behind one read-model handoff.
 */
class EntityDetailFacadeHandoffSourceOwnershipTest {

    private static final Path OBSERVE_ENTITY_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java");
    private static final Path ENTITY_DETAIL_OBSERVABILITY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDetailObservabilityReadModelService.java");

    @Test
    void observeEntityFacadeDelegatesEntityDetailAssemblyById() throws Exception {
        String facadeSource = Files.readString(OBSERVE_ENTITY_SERVICE_IMPL);
        String detailObservabilitySource = Files.readString(ENTITY_DETAIL_OBSERVABILITY_READ_MODEL_SERVICE);

        assertFalse(facadeSource.contains("buildEntityDetail(getEntityDto(entityId))"),
                "ObserveEntityServiceImpl should not compose entity detail through a facade self-call");
        assertTrue(facadeSource.contains("entityDetailObservabilityReadModelService.buildEntityDetail(entityId)"),
                "ObserveEntityServiceImpl should delegate entity detail loading and assembly by entity id");

        assertTrue(detailObservabilitySource.contains(
                        "private final EntityDetailReadModelService entityDetailReadModelService"),
                "Detail observability read model should own the entity DTO loading handoff");
        assertTrue(detailObservabilitySource.contains("public EntityDetailDto buildEntityDetail(long entityId)"),
                "Detail observability read model should expose an id-based detail assembly handoff");
        assertTrue(detailObservabilitySource.contains("entityDetailReadModelService.loadEntityDto(entityId)"),
                "Detail observability read model should load the entity DTO before runtime evidence assembly");
    }
}
