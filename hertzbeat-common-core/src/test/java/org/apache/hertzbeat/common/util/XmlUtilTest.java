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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;

/**
 * Test case for {@link XmlUtil}
 */
class XmlUtilTest {

    @Test
    void fromXmlWithTypeReferenceDeserializesMap() {
        Map<String, String> result = XmlUtil.fromXml(
                "<root><name>hertzbeat</name><size>40G</size></root>",
                new TypeReference<Map<String, String>>() {
                });
        assertNotNull(result);
        assertEquals("hertzbeat", result.get("name"));
        assertEquals("40G", result.get("size"));
    }

    @Test
    void fromXmlWithTypeReferenceDeserializesList() {
        List<String> result = XmlUtil.fromXml(
                "<list><item>alpha</item><item>beta</item></list>",
                new TypeReference<List<String>>() {
                });
        assertEquals(List.of("alpha", "beta"), result);
    }

    @Test
    void fromXmlWithTypeReferenceDeserializesNestedGenericType() {
        Map<String, Map<String, String>> result = XmlUtil.fromXml(
                "<root><server><name>hertzbeat</name><size>40G</size></server></root>",
                new TypeReference<Map<String, Map<String, String>>>() {
                });
        assertNotNull(result);
        Map<String, String> server = result.get("server");
        assertNotNull(server);
        assertEquals("hertzbeat", server.get("name"));
        assertEquals("40G", server.get("size"));
    }

    @Test
    void fromXmlWithTypeReferenceReturnsNullForNullEmptyOrMalformedXml() {
        assertNull(XmlUtil.fromXml((String) null, new TypeReference<Map<String, String>>() {
        }));
        assertNull(XmlUtil.fromXml("", new TypeReference<Map<String, String>>() {
        }));
        assertNull(XmlUtil.fromXml("<root><name>hertzbeat", new TypeReference<Map<String, String>>() {
        }));
    }

    @Test
    void fromXmlWithClassOverloadIsUnchanged() {
        Map<?, ?> result = XmlUtil.fromXml("<root><name>hertzbeat</name></root>", Map.class);
        assertNotNull(result);
        assertEquals("hertzbeat", result.get("name"));
        assertNull(XmlUtil.fromXml("", Map.class));
    }
}
