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

import java.nio.charset.StandardCharsets;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
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
    private static final String ENCODE_RULES = "tomSun28HaHaHaHa";

    /**
     * Default algorithm
     */
    private static final String ALGORITHM_STR = "AES/CBC/PKCS5Padding";

    private static final String AES = "AES";

    /**
     * Encryption key The AES encryption key is 16 bits.
     * If the AES encryption key is larger than 16 bits, an error message is displayed
     */
    private static String secretKey = ENCODE_RULES;

    private AesUtil() {}

    public static void setDefaultSecretKey(String secretKeyNow) {
        secretKey = secretKeyNow;
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
        try {
            // todo consider not init cipher every time and test performance
            SecretKeySpec keySpec = new SecretKeySpec(encryptKey.getBytes(StandardCharsets.UTF_8), AES);
            // cipher based on the algorithm AES
            Cipher cipher = Cipher.getInstance(ALGORITHM_STR);
            // init cipher Encrypt_mode or Decrypt_mode operation, the second parameter is the KEY used
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new IvParameterSpec(encryptKey.getBytes(StandardCharsets.UTF_8)));
            // get content bytes, must utf-8
            byte[] byteEncode = content.getBytes(StandardCharsets.UTF_8);
            // encode content to byte array
            byte[] byteAes = cipher.doFinal(byteEncode);
            // base64 encode content
            return new String(Base64.getEncoder().encode(byteAes), StandardCharsets.UTF_8);
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
            if (!ENCODE_RULES.equals(decryptKey)) {
                log.warn("There has default encode secret encode content, try to decode with default secret key");
                return aesDecode(content, ENCODE_RULES);
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
        // cipher based on the algorithm AES
        Cipher cipher = Cipher.getInstance(ALGORITHM_STR);
        // init cipher Encrypt_mode or Decrypt_mode operation, the second parameter is the KEY used
        cipher.init(Cipher.DECRYPT_MODE, keySpec, new IvParameterSpec(decryptKey.getBytes(StandardCharsets.UTF_8)));
        // base64 decode content
        byte[] bytesContent = Base64.getDecoder().decode(content);
        // decode content to byte array
        return cipher.doFinal(bytesContent);
    }
    
    /**
     * Determine whether it is encrypted
     * @param text text
     * @return true-是 false-否
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
