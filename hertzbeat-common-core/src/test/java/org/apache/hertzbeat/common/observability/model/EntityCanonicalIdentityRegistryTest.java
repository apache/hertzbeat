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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class EntityCanonicalIdentityRegistryTest {

    @Test
    void shouldExposeStableCanonicalIdentityContract() {
        assertTrue(EntityCanonicalIdentityRegistry.CANONICAL_OTEL_RESOURCE_KEYS.contains("service.name"));
        assertTrue(EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey("host.id"));
        assertFalse(EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey("custom.key"));
        assertEquals(140, EntityCanonicalIdentityRegistry.defaultPriority("service.instance.id"));
        assertEquals(40, EntityCanonicalIdentityRegistry.defaultPriority("custom.key"));
    }

    @Test
    void shouldKeepRuntimeSignalDimensionsOutOfStableEntityIdentities() {
        assertTrue(EntityCanonicalIdentityRegistry.isRuntimeSignalDimensionKey("trace_id"));
        assertTrue(EntityCanonicalIdentityRegistry.isRuntimeSignalDimensionKey("span.name"));
        assertTrue(EntityCanonicalIdentityRegistry.isRuntimeSignalDimensionKey("http.route"));
        assertTrue(EntityCanonicalIdentityRegistry.isRuntimeSignalDimensionKey("exception.type"));

        assertFalse(EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey("trace_id"));
        assertFalse(EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey("span.name"));
        assertFalse(EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey("http.route"));
        assertFalse(EntityCanonicalIdentityRegistry.isCanonicalOtelResourceKey("exception.type"));
        assertEquals(0, EntityCanonicalIdentityRegistry.defaultPriority("trace_id"));
        assertEquals(0, EntityCanonicalIdentityRegistry.defaultPriority("http.route"));
    }
}
