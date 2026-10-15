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
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps entity validation ownership out of the large entity service.
 */
class EntityValidationSourceOwnershipTest {

    private static final Path OBSERVE_ENTITY_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java");

    @Test
    void observeEntityServiceImplDelegatesValidationWithoutRetainingRules() throws Exception {
        String source = Files.readString(OBSERVE_ENTITY_SERVICE_IMPL);

        assertTrue(source.contains("EntityValidationService"));
        assertTrue(source.contains("entityValidationService.validate(entityDto, isModify);"));

        List<String> forbiddenFragments = List.of(
                "SUPPORTED_TYPES",
                "SUPPORTED_STATUS",
                "SUPPORTED_CRITICALITY",
                "Unsupported entity type.",
                "Entity name can not be blank.",
                "Unsupported entity status.",
                "Unsupported entity criticality.",
                "Entity identity key and value can not be blank.",
                "Monitor bind monitorId can not be null."
        );
        for (String fragment : forbiddenFragments) {
            assertFalse(source.contains(fragment),
                    () -> "ObserveEntityServiceImpl should delegate validation fragment `" + fragment + "`");
        }
    }
}
