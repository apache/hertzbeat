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

package org.apache.hertzbeat.templatehub.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class Base62UtilTest {

    @Test
    public void testIsBase62() {
        // Valid Base62 strings
        assertTrue(Base62Util.isBase62("0"));
        assertTrue(Base62Util.isBase62("A"));
        assertTrue(Base62Util.isBase62("z"));
        assertTrue(Base62Util.isBase62("1A3b")); // mixed case and digits

        // Invalid Base62 strings
        assertFalse(Base62Util.isBase62(null)); // null input
        assertFalse(Base62Util.isBase62("")); // empty input
        assertFalse(Base62Util.isBase62("")); // empty input
        assertFalse(Base62Util.isBase62("invalid!")); // contains invalid character
        assertFalse(Base62Util.isBase62("123!@#")); // contains invalid characters
    }

    @Test
    public void testIdToShortKey() {
        // Test conversion of long id to short key
        assertEquals("0", Base62Util.idToShortKey(0));
        assertEquals("1", Base62Util.idToShortKey(1));
        assertEquals("10", Base62Util.idToShortKey(62));
        assertEquals("A", Base62Util.idToShortKey(10));
        assertEquals("Z", Base62Util.idToShortKey(35));
        assertEquals("1a", Base62Util.idToShortKey(62 + 36)); // 98
        assertEquals("z", Base62Util.idToShortKey(61));
        assertEquals("10", Base62Util.idToShortKey(62)); // Boundary case
    }

    @Test
    public void testShortKeyToId() {
        // Test conversion of short key to long id
        assertEquals(0, Base62Util.shortKeyToId("0"));
        assertEquals(1, Base62Util.shortKeyToId("1"));
        assertEquals(10, Base62Util.shortKeyToId("A")); // 10 in Base62
        assertEquals(35, Base62Util.shortKeyToId("Z")); // 35 in Base62
        assertEquals(62, Base62Util.shortKeyToId("10")); // 62 in Base62
        assertEquals(98, Base62Util.shortKeyToId("1a")); // 98 in Base62
        assertEquals(61, Base62Util.shortKeyToId("z")); // 61 in Base62

        // Testing with padding
        assertEquals(0, Base62Util.shortKeyToId("000000")); // padding case
        assertEquals(1, Base62Util.shortKeyToId("000001")); // padding case
        assertEquals(10, Base62Util.shortKeyToId("00000A")); // padding case
    }
}