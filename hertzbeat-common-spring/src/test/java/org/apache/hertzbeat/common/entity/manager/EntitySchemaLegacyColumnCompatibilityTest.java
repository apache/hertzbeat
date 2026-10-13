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

package org.apache.hertzbeat.common.entity.manager;

import jakarta.persistence.Column;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Flyway keeps these columns strict for fresh installs; JPA metadata must stay
 * legacy-upgrade friendly so Hibernate can add columns to existing local H2 tables.
 */
class EntitySchemaLegacyColumnCompatibilityTest {

    @Test
    void additiveBackfillColumnsShouldRemainJpaNullable() throws NoSuchFieldException {
        assertColumnNullable(AuthToken.class, "tokenScope");
        assertColumnNullable(AuthToken.class, "workspaceId");
        assertColumnNullable(ObserveEntity.class, "workspaceId");
        assertColumnNullable(EntityDefinitionActivity.class, "workspaceId");
        assertColumnNullable(EntityGovernanceState.class, "workspaceId");
    }

    private static void assertColumnNullable(Class<?> entityClass, String fieldName) throws NoSuchFieldException {
        Column column = entityClass.getDeclaredField(fieldName).getAnnotation(Column.class);

        assertTrue(column.nullable(), () -> entityClass.getSimpleName() + "." + fieldName
                + " must allow legacy Hibernate add-column backfill; enforce NOT NULL in Flyway instead.");
    }
}
