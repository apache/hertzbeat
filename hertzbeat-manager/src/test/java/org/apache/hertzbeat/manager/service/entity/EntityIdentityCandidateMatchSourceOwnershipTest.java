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
 * Source contract that keeps persisted identity-match reads behind the identity read boundary.
 */
class EntityIdentityCandidateMatchSourceOwnershipTest {

    private static final Path ENTITY_IDENTITY_RESOLUTION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIdentityResolutionService.java");
    private static final Path ENTITY_IDENTITY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIdentityReadModelService.java");
    private static final Path ENTITY_IDENTITY_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIdentityQueryService.java");

    @Test
    void identityResolutionDelegatesPersistedMatchLookupToIdentityReadModel() throws Exception {
        String resolutionSource = Files.readString(ENTITY_IDENTITY_RESOLUTION_SERVICE);
        String readModelSource = Files.readString(ENTITY_IDENTITY_READ_MODEL_SERVICE);
        String querySource = Files.readString(ENTITY_IDENTITY_QUERY_SERVICE);

        assertFalse(resolutionSource.contains("EntityIdentityDao"),
                "Identity resolution should not reach through to identity storage directly");
        assertFalse(resolutionSource.contains("entityIdentityDao"),
                "Identity resolution should delegate persisted identity matches to the read boundary");
        assertTrue(resolutionSource.contains(
                "private final EntityIdentityReadModelService entityIdentityReadModelService"));
        assertTrue(resolutionSource.contains("entityIdentityReadModelService.findMatchingIdentities("));
        assertTrue(resolutionSource.indexOf("extractMonitorIdentityCandidates(monitor)")
                        < resolutionSource.indexOf("entityIdentityReadModelService.findMatchingIdentities("));
        assertTrue(resolutionSource.indexOf("entityIdentityReadModelService.findMatchingIdentities(")
                        < resolutionSource.indexOf("entityMonitorBindService.findMonitorBindsByMonitorId("));

        assertTrue(readModelSource.contains(
                "public List<EntityIdentity> findMatchingIdentities(Set<String> identityKeys, Set<String> normalizedValues)"));
        assertTrue(readModelSource.contains(
                "entityIdentityQueryService.findMatchingIdentities(identityKeys, normalizedValues)"));
        assertFalse(readModelSource.contains(
                "entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(identityKeys, normalizedValues)"));
        assertTrue(querySource.contains(
                "public List<EntityIdentity> findMatchingIdentities(Set<String> identityKeys, Set<String> normalizedValues)"));
        assertTrue(querySource.contains(
                "entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(identityKeys, normalizedValues)"));
    }
}
