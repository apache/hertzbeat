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
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;

/**
 * AES Decode Encode Util
 */
@Slf4j
public final class AesUtil {

    /**
     *  Default encryption key The AES encryption key is 16 bits by default.
     *  If the AES encryption key is larger than or smaller than 16 bits, an error message is displayed
     */
    public static final String DEFAULT_ENCODE_RULES = "tomSun28HaHaHaHa";

    /**
     * Default algorithm
     */
    private static final String CBC_ALGORITHM_STR = "AES/CBC/PKCS5Padding";

    private static final String AES = "AES";

    private static final String AUTHENTICATED_ALGORITHM_STR = "AES/GCM/NoPadding";

    private static final byte[] CBC_PAYLOAD_HEADER = {'H', 'B', 'A', '2'};

    private static final byte[] AUTHENTICATED_PAYLOAD_HEADER = {'H', 'B', 'A', '3'};

    private static final int CBC_IV_LENGTH = 16;

    private static final int GCM_NONCE_LENGTH = 12;

    private static final int GCM_TAG_LENGTH_BITS = 128;

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
     * Encrypt plaintext in the authenticated payload format.
     *
     * @param content content
     * @param encryptKey secretKey
     * @return ciphertext
     */
    public static String aesEncode(String content, String encryptKey) {
        try {
            SecretKeySpec keySpec = new SecretKeySpec(encryptKey.getBytes(StandardCharsets.UTF_8), AES);
            Cipher cipher = Cipher.getInstance(AUTHENTICATED_ALGORITHM_STR);
            byte[] nonce = new byte[GCM_NONCE_LENGTH];
            SECURE_RANDOM.nextBytes(nonce);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce));
            cipher.updateAAD(AUTHENTICATED_PAYLOAD_HEADER);
            // get content bytes, must utf-8
            byte[] byteEncode = content.getBytes(StandardCharsets.UTF_8);
            // encode content to byte array
            byte[] byteAes = cipher.doFinal(byteEncode);
            byte[] payload = ByteBuffer.allocate(AUTHENTICATED_PAYLOAD_HEADER.length + nonce.length + byteAes.length)
                    .put(AUTHENTICATED_PAYLOAD_HEADER)
                    .put(nonce)
                    .put(byteAes)
                    .array();
            // base64 encode content
            return Base64.getEncoder().encodeToString(payload);
        } catch (Exception e) {
            log.error("aes encode content error: {}", e.getMessage(), e);
            return content;
        }
    }

    /**
     * Decrypt ciphertext
     *
     * @param content ciphertext
     * @param decryptKey secretKey
     * @return content
     */
    public static String aesDecode(String content, String decryptKey) {
        try {
            byte[] byteDecode = getBytes(content, decryptKey);
            return new String(byteDecode, StandardCharsets.UTF_8);
        } catch (BadPaddingException e) {
            if (!DEFAULT_ENCODE_RULES.equals(decryptKey)) {
                log.warn("There has default encode secret encode content, try to decode with default secret key");
                return aesDecode(content, DEFAULT_ENCODE_RULES);
            }
            log.error("aes decode content error: {}, please config right common secret key", e.getMessage());
            return content;
        } catch (NoSuchAlgorithmException e) {
            log.error("no such algorithm: {}", e.getMessage(), e);
        } catch (IllegalBlockSizeException e) {
            log.error("illegal block size: {}", e.getMessage(), e);
        } catch (NullPointerException e) {
            log.error("null point exception: {}", e.getMessage(), e);
        } catch (Exception e) {
            log.error("aes decode error: {}", e.getMessage(), e);
        }
        return content;
    }
    
    private static byte[] getBytes(final String content, final String decryptKey) throws Exception {
        SecretKeySpec keySpec = new SecretKeySpec(decryptKey.getBytes(StandardCharsets.UTF_8), AES);
        byte[] bytesContent = Base64.getDecoder().decode(content);
        if (hasPayloadHeader(bytesContent, AUTHENTICATED_PAYLOAD_HEADER)) {
            return decryptAuthenticatedPayload(bytesContent, keySpec);
        }
        return decryptCbcPayload(bytesContent, decryptKey, keySpec);
    }

    private static byte[] decryptAuthenticatedPayload(byte[] payload, SecretKeySpec keySpec) throws Exception {
        int encryptedOffset = AUTHENTICATED_PAYLOAD_HEADER.length + GCM_NONCE_LENGTH;
        int minimumPayloadLength = encryptedOffset + GCM_TAG_LENGTH_BITS / Byte.SIZE;
        if (payload.length < minimumPayloadLength) {
            throw new IllegalArgumentException("Invalid authenticated encrypted payload");
        }
        byte[] nonce = Arrays.copyOfRange(
                payload, AUTHENTICATED_PAYLOAD_HEADER.length, encryptedOffset);
        Cipher cipher = Cipher.getInstance(AUTHENTICATED_ALGORITHM_STR);
        cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce));
        cipher.updateAAD(AUTHENTICATED_PAYLOAD_HEADER);
        return cipher.doFinal(payload, encryptedOffset, payload.length - encryptedOffset);
    }

    private static byte[] decryptCbcPayload(byte[] bytesContent, String decryptKey, SecretKeySpec keySpec)
            throws Exception {
        byte[] initializationVector;
        if (hasPayloadHeader(bytesContent, CBC_PAYLOAD_HEADER)) {
            if (bytesContent.length <= CBC_PAYLOAD_HEADER.length + CBC_IV_LENGTH) {
                throw new IllegalArgumentException("Invalid encrypted payload");
            }
            initializationVector = Arrays.copyOfRange(
                    bytesContent, CBC_PAYLOAD_HEADER.length, CBC_PAYLOAD_HEADER.length + CBC_IV_LENGTH);
            bytesContent = Arrays.copyOfRange(
                    bytesContent, CBC_PAYLOAD_HEADER.length + CBC_IV_LENGTH, bytesContent.length);
        } else {
            initializationVector = decryptKey.getBytes(StandardCharsets.UTF_8);
        }
        Cipher cipher = Cipher.getInstance(CBC_ALGORITHM_STR);
        cipher.init(Cipher.DECRYPT_MODE, keySpec, new IvParameterSpec(initializationVector));
        return cipher.doFinal(bytesContent);
    }

    private static boolean hasPayloadHeader(byte[] payload, byte[] expectedHeader) {
        if (payload.length < expectedHeader.length) {
            return false;
        }
        for (int index = 0; index < expectedHeader.length; index++) {
            if (payload[index] != expectedHeader[index]) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Determine whether it is encrypted
     * @param text text
     * @return true false
     */
    public static boolean isCiphertext(String text, String decryptKey) {
        // First use whether it is base64 to determine whether it has been encrypted
        if (Base64Util.isBase64(text)) {
            // if it is base64, decrypt directly to determine
            try {
                byte[] byteDecode = getBytes(text, decryptKey);
                return byteDecode != null;
            } catch (Exception e) {
                log.warn("isCiphertext method error: {}", e.getMessage());
                return false;
            }
        }
        return false;
    }
}
