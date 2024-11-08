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

import static org.apache.hertzbeat.common.util.AesUtil.aesDecode;
import static org.apache.hertzbeat.common.util.AesUtil.aesEncode;
import static org.apache.hertzbeat.common.util.AesUtil.isCiphertext;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AesUtil}
 */
class AesUtilTest {

    private static final String ALGORITHM_STR = "AES/CBC/PKCS5Padding";

    private static final String AES = "AES";

    private static final String VALID_KEY = "1234567890123456";

    private static final String ENCODE_RULES = "defaultsecretkey";

    @Test
    void testAesEncode() {
        String originalText = "This is a secret message";
        String encryptedText = aesEncode(originalText, VALID_KEY);
        assertNotEquals(originalText, encryptedText);

        String decryptedText = aesDecode(encryptedText, VALID_KEY);
        assertEquals(originalText, decryptedText);
    }

    @Test
    void testAesDecode() {
        // Test with invalid key
        String originalText = "This is a secret message";
        String encryptedText = aesEncode(originalText, VALID_KEY);
        String decryptedText = aesDecode(encryptedText, "invalidkey123456");
        assertNotEquals(originalText, decryptedText);

        // Test with default key
        originalText = "This is a secret message";
        encryptedText = aesEncode(originalText, VALID_KEY);
        decryptedText = aesDecode(encryptedText, "invalidkey123456");
        if (!decryptedText.equals(originalText)) {
            decryptedText = aesDecode(encryptedText, ENCODE_RULES);
        }
        assertNotEquals(originalText, decryptedText);
    }

    @Test
    void testIsCiphertext() {

        // Test with valid key
        String originalText = "This is a secret message";
        String encryptedText = aesEncode(originalText, VALID_KEY);
        assertTrue(isCiphertext(encryptedText, VALID_KEY));

        // Test with plain text, normal text is not ciphertext
        String plainText = "This is not encrypted";
        assertFalse(isCiphertext(plainText, VALID_KEY));

        // Test with invalid base64 text
        String invalidBase64Text = "InvalidBase64";
        assertFalse(isCiphertext(invalidBase64Text, VALID_KEY));

        // Test with invalid key
        originalText = "This is a secret message";
        encryptedText = aesEncode(originalText, VALID_KEY);
        String invalidKey = "6543210987654321";
        assertFalse(isCiphertext(encryptedText, invalidKey));
    }

}
