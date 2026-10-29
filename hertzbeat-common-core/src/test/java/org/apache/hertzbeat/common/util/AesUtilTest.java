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
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AesUtil}
 */
class AesUtilTest {

    private static final String ALGORITHM_STR = "AES/CBC/PKCS5Padding";

    private static final String AES = "AES";

    private static final String VALID_KEY = "1234567890123456";

    private static final String DEFAULT_KEY_CIPHERTEXT =
            "SEJBMgABAgMEBQYHCAkKCwwNDg+n43EJKwgtYD7Jvh0pn2qjlhYerYPjVQw8b5+e4fmnCA==";
    private static final String AMBIGUOUS_DEFAULT_KEY_CIPHERTEXT =
            "SEJBMgAAAAAAAAAAAAAAAAAAAz+DCz3LWaOCMiHK2E32IJCdysYty+2YhcUdccPp08KRjQ==";
    private static final String AMBIGUOUS_CURRENT_KEY_CIPHERTEXT =
            "SEJBMjiUOslv6EforqVI6iA+xocDKgPaycfwdti1Gj1A8jrH+vgt1HmmeCmqTg7QFetaYg==";

    @Test
    void testAesEncode() {
        String originalText = "This is a secret message";
        String encryptedText = aesEncode(originalText, VALID_KEY);
        String secondEncryptedText = aesEncode(originalText, VALID_KEY);
        assertNotEquals(originalText, encryptedText);
        assertNotEquals(encryptedText, secondEncryptedText);

        byte[] encryptedPayload = Base64.getDecoder().decode(encryptedText);
        byte[] secondEncryptedPayload = Base64.getDecoder().decode(secondEncryptedText);
        assertArrayEquals(new byte[] {'H', 'B', 'A', '2'}, Arrays.copyOfRange(encryptedPayload, 0, 4));
        assertFalse(Arrays.equals(
                VALID_KEY.getBytes(StandardCharsets.UTF_8), Arrays.copyOfRange(encryptedPayload, 4, 20)));
        assertFalse(Arrays.equals(
                Arrays.copyOfRange(encryptedPayload, 4, 20),
                Arrays.copyOfRange(secondEncryptedPayload, 4, 20)));

        String decryptedText = aesDecode(encryptedText, VALID_KEY);
        assertEquals(originalText, decryptedText);
    }

    @Test
    void testLegacyCiphertextCanBeDecoded() {
        String legacyCiphertext = "muJNZwhxg173v6EZAXb5TK8L5XlmDE5xmc9XTryH6Qk=";

        assertEquals("This is a secret message", aesDecode(legacyCiphertext, VALID_KEY));
        assertTrue(isCiphertext(legacyCiphertext, VALID_KEY));
    }

    @Test
    void testAesDecode() {
        String encryptedText = aesEncode("This is a secret message", VALID_KEY);
        assertThrows(IllegalStateException.class, () -> aesDecode(encryptedText, "invalidkey123456"));
    }

    @Test
    void testIsCiphertext() {

        // Test with valid key
        String originalText = "This is a secret message";
        String encryptedText = aesEncode(originalText, VALID_KEY);
        assertTrue(isCiphertext(encryptedText, VALID_KEY));

        byte[] corruptedPayload = Base64.getDecoder().decode(encryptedText);
        byte[] truncatedPayload = Arrays.copyOf(corruptedPayload, corruptedPayload.length - 1);
        assertThrows(IllegalStateException.class,
                () -> isCiphertext(Base64.getEncoder().encodeToString(truncatedPayload), VALID_KEY));

        // Test with plain text, normal text is not ciphertext
        String plainText = "This is not encrypted";
        assertFalse(isCiphertext(plainText, VALID_KEY));

        // Test with invalid base64 text
        String invalidBase64Text = "InvalidBase64";
        assertFalse(isCiphertext(invalidBase64Text, VALID_KEY));

        // Valid base64 that cannot be decrypted: 3 bytes is not a block multiple
        assertFalse(isCiphertext("AAAA", VALID_KEY));
    }

    @Test
    void testDefaultKeyCompatibility() {
        // This historical payload decrypts under both keys to different plaintexts.
        assertThrows(IllegalStateException.class,
                () -> aesDecode(AMBIGUOUS_DEFAULT_KEY_CIPHERTEXT, "newkey1234567890"));
        assertEquals("This is a secret message",
                aesDecode(AMBIGUOUS_DEFAULT_KEY_CIPHERTEXT, AesUtil.DEFAULT_ENCODE_RULES));
    }

    @Test
    void testAesEncodeRetriesAnIvThatWouldBeAmbiguousWithDefaultFallback() {
        String currentKey = "0123456789abcdef";
        String plaintext = "legacy-ollama-key";
        byte[] ambiguousPayload = Base64.getDecoder().decode(AMBIGUOUS_CURRENT_KEY_CIPHERTEXT);
        byte[] ambiguousIv = Arrays.copyOfRange(ambiguousPayload, 4, 20);
        assertEquals(AMBIGUOUS_CURRENT_KEY_CIPHERTEXT,
                encryptHba2(plaintext, currentKey, ambiguousIv));
        assertThrows(IllegalStateException.class,
                () -> isCiphertext(AMBIGUOUS_CURRENT_KEY_CIPHERTEXT, currentKey));

        byte[] safeIv = findSafeIv(plaintext, currentKey);
        SequenceSecureRandom secureRandom = new SequenceSecureRandom(ambiguousIv, safeIv);
        String encrypted = AesUtil.aesEncode(plaintext, currentKey, secureRandom);

        assertEquals(2, secureRandom.calls());
        assertEquals(encryptHba2(plaintext, currentKey, safeIv), encrypted);
        assertTrue(isCiphertext(encrypted, currentKey));
        assertEquals(plaintext, aesDecode(encrypted, currentKey));
    }

    @Test
    void testAesEncodeDoesNotReturnPlaintextWhenNoSafeIvCanBeGenerated() {
        String currentKey = "0123456789abcdef";
        String plaintext = "legacy-ollama-key";
        byte[] payload = Base64.getDecoder().decode(AMBIGUOUS_CURRENT_KEY_CIPHERTEXT);
        byte[] ambiguousIv = Arrays.copyOfRange(payload, 4, 20);
        byte[][] repeatedIvs = new byte[16][];
        Arrays.fill(repeatedIvs, ambiguousIv);
        SequenceSecureRandom secureRandom = new SequenceSecureRandom(repeatedIvs);

        assertThrows(IllegalStateException.class,
                () -> AesUtil.aesEncode(plaintext, currentKey, secureRandom));
        assertEquals(repeatedIvs.length, secureRandom.calls());
    }

    @Test
    void testAesEncodePropagatesEncryptionFailureWithoutReturningPlaintext() {
        String plaintext = "sensitive-plaintext";
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> AesUtil.aesEncode(plaintext, "invalid-key"));

        assertEquals("Unable to encrypt value", error.getMessage());
        assertNotEquals(plaintext, error.getMessage());
    }

    @Test
    void testAmbiguityAlsoFailsWhenCurrentKeyIsCorrect() {
        String currentKey = "newkey1234567890";
        String plaintext = "123456789012345";
        String ambiguous = null;
        for (int seed = 0; seed < 10_000 && ambiguous == null; seed++) {
            byte[] iv = new byte[16];
            ByteBuffer.wrap(iv, 12, 4).putInt(seed);
            String candidate = encryptHba2(plaintext, currentKey, iv);
            try {
                // The default key is wrong, but this IV makes its CBC padding valid.
                String otherPlaintext = aesDecode(candidate, AesUtil.DEFAULT_ENCODE_RULES);
                if (!plaintext.equals(otherPlaintext)) {
                    ambiguous = candidate;
                }
            } catch (IllegalStateException ignored) {
                // This is expected for IV values that do not yield valid padding.
            }
        }
        assertTrue(ambiguous != null, "expected to find a valid-padding wrong-key fixture");
        String finalAmbiguous = ambiguous;
        assertThrows(IllegalStateException.class, () -> aesDecode(finalAmbiguous, currentKey));
        assertThrows(IllegalStateException.class, () -> isCiphertext(finalAmbiguous, currentKey));
    }

    @Test
    void testDecodeRequiredRejectsCorruptedOrPlainValues() {
        assertThrows(IllegalStateException.class, () -> AesUtil.aesDecodeRequired("not encrypted"));
        byte[] payload = Base64.getDecoder().decode(DEFAULT_KEY_CIPHERTEXT);
        byte[] truncatedPayload = Arrays.copyOf(payload, payload.length - 1);
        assertThrows(IllegalStateException.class,
                () -> AesUtil.aesDecodeRequired(Base64.getEncoder().encodeToString(truncatedPayload)));
        assertThrows(IllegalStateException.class,
                () -> AesUtil.aesDecodeRequired(Base64.getEncoder().encodeToString(
                        Arrays.copyOf(payload, payload.length - 5))));
    }

    @Test
    void testUnicodeEmptyAndLongRoundTrips() {
        for (String text : new String[] {"", "安全性🙂", "长文本".repeat(10_000)}) {
            String encrypted = aesEncode(text, VALID_KEY);
            assertEquals(text, aesDecode(encrypted, VALID_KEY));
        }
    }

    @Test
    void testCurrentAndDefaultKeyAreTriedOnlyOnceWhenEqual() {
        String originalSecret = AesUtil.getDefaultSecretKey();
        try {
            AesUtil.setDefaultSecretKey(AesUtil.DEFAULT_ENCODE_RULES);
            String encrypted = aesEncode("same-key", AesUtil.DEFAULT_ENCODE_RULES);
            assertEquals("same-key", AesUtil.aesDecodeRequired(encrypted));
            assertTrue(AesUtil.isCiphertext(encrypted));
        } finally {
            AesUtil.setDefaultSecretKey(originalSecret);
        }
    }

    @Test
    void testLegacyDefaultKeyFallback() {
        String legacy = encryptLegacy("legacy secret", AesUtil.DEFAULT_ENCODE_RULES);
        assertEquals("legacy secret", aesDecode(legacy, "newkey1234567890"));
    }

    private static String encryptLegacy(String plaintext, String key) {
        try {
            javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance(ALGORITHM_STR);
            javax.crypto.spec.SecretKeySpec keySpec =
                    new javax.crypto.spec.SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), AES);
            cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, keySpec,
                    new javax.crypto.spec.IvParameterSpec(key.getBytes(StandardCharsets.UTF_8)));
            return Base64.getEncoder().encodeToString(cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new AssertionError(e);
        }
    }

    private static String encryptHba2(String plaintext, String key, byte[] iv) {
        try {
            javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance(ALGORITHM_STR);
            javax.crypto.spec.SecretKeySpec keySpec =
                    new javax.crypto.spec.SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), AES);
            cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, keySpec, new javax.crypto.spec.IvParameterSpec(iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[4 + iv.length + encrypted.length];
            System.arraycopy(new byte[] {'H', 'B', 'A', '2'}, 0, payload, 0, 4);
            System.arraycopy(iv, 0, payload, 4, iv.length);
            System.arraycopy(encrypted, 0, payload, 20, encrypted.length);
            return Base64.getEncoder().encodeToString(payload);
        } catch (Exception e) {
            throw new AssertionError(e);
        }
    }

    private static byte[] findSafeIv(String plaintext, String key) {
        for (int seed = 0; seed < 10_000; seed++) {
            byte[] iv = new byte[16];
            ByteBuffer.wrap(iv, 12, 4).putInt(seed);
            try {
                if (isCiphertext(encryptHba2(plaintext, key, iv), key)) {
                    return iv;
                }
            } catch (IllegalStateException ignored) {
                // Wrong-key padding is valid for this IV.
            }
        }
        throw new AssertionError("Could not find an IV that is unambiguous with the default key");
    }

    private static final class SequenceSecureRandom extends SecureRandom {

        private static final long serialVersionUID = 1L;

        private final byte[][] values;

        private int calls;

        private SequenceSecureRandom(byte[]... values) {
            this.values = values;
        }

        @Override
        public void nextBytes(byte[] bytes) {
            System.arraycopy(values[calls++], 0, bytes, 0, bytes.length);
        }

        int calls() {
            return calls;
        }
    }
}
