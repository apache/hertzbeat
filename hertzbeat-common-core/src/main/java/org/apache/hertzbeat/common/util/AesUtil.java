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

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * AES Decode Encode Util
 */
public final class AesUtil {

    /**
     *  Default encryption key The AES encryption key is 16 bits by default.
     *  If the AES encryption key is larger than or smaller than 16 bits, an error message is displayed
     */
    public static final String DEFAULT_ENCODE_RULES = "tomSun28HaHaHaHa";

    /**
     * Default algorithm
     */
    private static final String ALGORITHM_STR = "AES/CBC/PKCS5Padding";

    private static final String AES = "AES";

    private static final byte[] PAYLOAD_HEADER = {'H', 'B', 'A', '2'};

    private static final int IV_LENGTH = 16;

    private static final int MAX_IV_ATTEMPTS = 16;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Encryption key The AES encryption key is 16 bits.
     * If the AES encryption key is larger than 16 bits, an error message is displayed
     */
    private static String secretKey = DEFAULT_ENCODE_RULES;

    private AesUtil() {}

    public static void setDefaultSecretKey(String secretKeyNow) {
        secretKey = secretKeyNow;
    }
    
    public static String getDefaultSecretKey() {
        return secretKey;
    }

    public static String aesEncode(String content) {
        return aesEncode(content, secretKey);
    }

    public static String aesDecode(String content) {
        return aesDecode(content, secretKey);
    }

    public static boolean isCiphertext(String text) {
        return isCiphertext(text, secretKey);
    }

    /**
     * Encrypted plaintext aes cbc mode
     *
     * @param content content
     * @param encryptKey secretKey
     * @return ciphertext
     */
    public static String aesEncode(String content, String encryptKey) {
        return aesEncode(content, encryptKey, SECURE_RANDOM);
    }

    static String aesEncode(String content, String encryptKey, SecureRandom secureRandom) {
        try {
            // todo consider not init cipher every time and test performance
            SecretKeySpec keySpec = new SecretKeySpec(encryptKey.getBytes(StandardCharsets.UTF_8), AES);
            // cipher based on the algorithm AES
            Cipher cipher = Cipher.getInstance(ALGORITHM_STR);
            // get content bytes, must utf-8
            byte[] byteEncode = content.getBytes(StandardCharsets.UTF_8);
            for (int attempt = 0; attempt < MAX_IV_ATTEMPTS; attempt++) {
                byte[] initializationVector = new byte[IV_LENGTH];
                secureRandom.nextBytes(initializationVector);
                // init cipher Encrypt_mode or Decrypt_mode operation, the second parameter is the KEY used
                cipher.init(Cipher.ENCRYPT_MODE, keySpec, new IvParameterSpec(initializationVector));
                // encode content to byte array
                byte[] byteAes = cipher.doFinal(byteEncode);
                byte[] payload = ByteBuffer.allocate(PAYLOAD_HEADER.length + initializationVector.length + byteAes.length)
                        .put(PAYLOAD_HEADER)
                        .put(initializationVector)
                        .put(byteAes)
                        .array();
                if (!isAmbiguousWithDefaultKey(payload, encryptKey, byteEncode)) {
                    // base64 encode content
                    return Base64.getEncoder().encodeToString(payload);
                }
            }
            throw new IllegalStateException("Could not generate a ciphertext distinguishable from the default-key fallback");
        } catch (Exception e) {
            throw new IllegalStateException("Unable to encrypt value", e);
        }
    }

    private static boolean isAmbiguousWithDefaultKey(byte[] payload, String encryptKey, byte[] plaintext) {
        if (DEFAULT_ENCODE_RULES.equals(encryptKey)) {
            return false;
        }
        byte[] defaultPlaintext = tryDecrypt(payload, DEFAULT_ENCODE_RULES);
        return defaultPlaintext != null && !Arrays.equals(plaintext, defaultPlaintext);
    }

    /**
     * Decrypt ciphertext
     *
     * @param content ciphertext
     * @param decryptKey secretKey
     * @return content
     */
    public static String aesDecode(String content, String decryptKey) {
        return decode(content, decryptKey, false);
    }

    /**
     * Decode a password value that must be encrypted. Unlike {@link #aesDecode(String, String)},
     * this method rejects values that cannot be decrypted instead of passing them through.
     */
    public static String aesDecodeRequired(String content) {
        return decode(content, secretKey, true);
    }

    private static String decode(String content, String decryptKey, boolean required) {
        byte[] payload = decodeBase64(content);
        boolean tagged = hasPayloadHeader(payload);
        if (required && (payload.length == 0
                || (!tagged && payload.length % IV_LENGTH != 0))) {
            throw new IllegalStateException("Value is not a valid encrypted payload");
        }
        byte[] activePlain = tryDecrypt(payload, decryptKey);
        byte[] defaultPlain = decryptKey.equals(DEFAULT_ENCODE_RULES)
                ? activePlain : tryDecrypt(payload, DEFAULT_ENCODE_RULES);
        if (activePlain != null && defaultPlain != null && !Arrays.equals(activePlain, defaultPlain)) {
            throw new IllegalStateException("Encrypted value is ambiguous: current and default keys decrypt it differently");
        }
        byte[] plaintext = activePlain != null ? activePlain : defaultPlain;
        if (plaintext != null) {
            return new String(plaintext, StandardCharsets.UTF_8);
        }
        if (tagged || required) {
            throw new IllegalStateException("Unable to decrypt encrypted value; verify the configured common secret key");
        }
        return content;
    }

    private static byte[] decodeBase64(String content) {
        try {
            return Base64.getDecoder().decode(content);
        } catch (RuntimeException e) {
            return new byte[0];
        }
    }

    private static byte[] tryDecrypt(byte[] payload, String decryptKey) {
        try {
            return decrypt(payload, decryptKey);
        } catch (Exception e) {
            return null;
        }
    }
    
    private static byte[] decrypt(final byte[] input, final String decryptKey) throws Exception {
        SecretKeySpec keySpec = new SecretKeySpec(decryptKey.getBytes(StandardCharsets.UTF_8), AES);
        // cipher based on the algorithm AES
        Cipher cipher = Cipher.getInstance(ALGORITHM_STR);
        byte[] bytesContent = input.clone();
        byte[] initializationVector;
        if (hasPayloadHeader(bytesContent)) {
            if (bytesContent.length <= PAYLOAD_HEADER.length + IV_LENGTH) {
                throw new IllegalArgumentException("Invalid encrypted payload");
            }
            initializationVector = Arrays.copyOfRange(
                    bytesContent, PAYLOAD_HEADER.length, PAYLOAD_HEADER.length + IV_LENGTH);
            bytesContent = Arrays.copyOfRange(
                    bytesContent, PAYLOAD_HEADER.length + IV_LENGTH, bytesContent.length);
        } else {
            initializationVector = decryptKey.getBytes(StandardCharsets.UTF_8);
        }
        // init cipher Encrypt_mode or Decrypt_mode operation, the second parameter is the KEY used
        cipher.init(Cipher.DECRYPT_MODE, keySpec, new IvParameterSpec(initializationVector));
        // decode content to byte array
        return cipher.doFinal(bytesContent);
    }

    private static boolean hasPayloadHeader(byte[] payload) {
        if (payload.length < PAYLOAD_HEADER.length) {
            return false;
        }
        for (int index = 0; index < PAYLOAD_HEADER.length; index++) {
            if (payload[index] != PAYLOAD_HEADER[index]) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Determine whether it is encrypted
     * @param text text
     * @return true when a supported current or legacy ciphertext is recognized
     * @throws IllegalStateException when a tagged value is invalid or known keys decrypt it differently
     */
    public static boolean isCiphertext(String text, String decryptKey) {
        if (text == null || !Base64Util.isBase64(text)) {
            return false;
        }
        byte[] payload = decodeBase64(text);
        boolean tagged = hasPayloadHeader(payload);
        if (tagged) {
            // A tagged payload is unambiguously intended to be encrypted. Reject corrupt or
            // ambiguous values instead of letting management code re-encrypt them as plaintext.
            decode(text, decryptKey, true);
            return true;
        }
        // Legacy CBC has no marker, so preserve the historical heuristic for arbitrary
        // Base64 strings while refusing cases where both known keys yield different plaintexts.
        if (payload.length == 0 || payload.length % IV_LENGTH != 0) {
            return false;
        }
        byte[] activePlain = tryDecrypt(payload, decryptKey);
        byte[] defaultPlain = decryptKey.equals(DEFAULT_ENCODE_RULES)
                ? activePlain : tryDecrypt(payload, DEFAULT_ENCODE_RULES);
        if (activePlain != null && defaultPlain != null && !Arrays.equals(activePlain, defaultPlain)) {
            throw new IllegalStateException("Encrypted value is ambiguous: current and default keys decrypt it differently");
        }
        return activePlain != null || defaultPlain != null;
    }
}
