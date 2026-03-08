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

import static org.apache.hertzbeat.common.util.Base64Util.isBase64;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link Base64Util}
 */
class Base64UtilTest {

    @Test
    void testIsBase64() {

        String validBase64String = "VGhpcyBpcyBhIHRlc3Qgc3RyaW5n";
        assertTrue(isBase64(validBase64String));

        String invalidBase64String = "This is not a valid Base64 string!";
        assertFalse(isBase64(invalidBase64String));

        String emptyString = "";
        assertFalse(isBase64(emptyString));

        assertFalse(isBase64(null));

        String whitespaceString = " ";
        assertFalse(isBase64(whitespaceString));

        String paddedBase64String = "VGhpcyBpcyBhIHRlc3Qgc3RyaW5n===";
        assertFalse(isBase64(paddedBase64String));
    }
}
