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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class JsonEntityOwnerRefListAttributeConverterTest {

    private final JsonEntityOwnerRefListAttributeConverter converter = new JsonEntityOwnerRefListAttributeConverter();

    @Test
    void shouldDeserializeLegacyStringArray() {
        List<EntityOwnerRef> owners = converter.convertToEntityAttribute("[\"search-platform\",\"payments-oncall\"]");

        assertEquals(2, owners.size());
        assertEquals("search-platform", owners.getFirst().getName());
        assertEquals("team", owners.getFirst().getType());
        assertEquals("payments-oncall", owners.get(1).getName());
        assertEquals("team", owners.get(1).getType());
    }

    @Test
    void shouldDeserializeOwnerRefObjects() {
        List<EntityOwnerRef> owners = converter.convertToEntityAttribute("[{\"name\":\"search-platform\",\"type\":\"team\"}]");

        assertEquals(1, owners.size());
        assertEquals("search-platform", owners.getFirst().getName());
        assertEquals("team", owners.getFirst().getType());
    }

    @Test
    void shouldDeserializePlainStringValue() {
        List<EntityOwnerRef> owners = converter.convertToEntityAttribute("payments-oncall");

        assertEquals(1, owners.size());
        assertEquals("payments-oncall", owners.getFirst().getName());
        assertEquals("team", owners.getFirst().getType());
    }

    @Test
    void shouldIgnoreInvalidEntries() {
        List<EntityOwnerRef> owners = converter.convertToEntityAttribute("[{\"type\":\"team\"},null,\"\"]");

        assertTrue(owners.isEmpty());
    }
}
