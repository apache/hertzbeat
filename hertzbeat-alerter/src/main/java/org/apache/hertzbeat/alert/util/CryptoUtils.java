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

package org.apache.hertzbeat.alert.util;

import lombok.extern.slf4j.Slf4j;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import javax.xml.bind.DatatypeConverter;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * General encryption utility class
 */
@Slf4j
public class CryptoUtils {

    private static final Charset UTF8 = StandardCharsets.UTF_8;

    private CryptoUtils() {}

    /**
     * Calculate HMAC-SHA256 signature
     * @param key secret key
     * @param msg message to be signed
     * @return signed byte array
     */
    public static byte[] hmac256(byte[] key, String msg) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key, mac.getAlgorithm());
            mac.init(secretKeySpec);
            return mac.doFinal(msg.getBytes(UTF8));
        } catch (Exception e) {
            log.error("Failed to calculate HMAC-SHA256: {}", e.getMessage());
            throw new RuntimeException("Failed to calculate HMAC-SHA256", e);
        }
    }

    /**
     * Calculate SHA256 hash and convert to lowercase hexadecimal string
     * @param data data to be hashed
     * @return lowercase hexadecimal string
     */
    public static String sha256Hex(String data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(data.getBytes(UTF8));
            return DatatypeConverter.printHexBinary(digest).toLowerCase();
        } catch (Exception e) {
            log.error("Failed to calculate SHA256: {}", e.getMessage());
            throw new RuntimeException("Failed to calculate SHA256", e);
        }
    }

    /**
     * Calculate HMAC-SHA256 signature and convert to Base64 string
     * @param key secret key
     * @param data data to be signed
     * @return Base64 encoded signature string
     */
    public static String hmacSha256Base64(String key, String data) {
        byte[] hmacResult = hmac256(key.getBytes(UTF8), data);
        return Base64.getEncoder().encodeToString(hmacResult);
    }

    /**
     * Calculate HMAC-SHA256 signature and convert to lowercase hexadecimal string
     * @param key secret key
     * @param data data to be signed
     * @return lowercase hexadecimal string
     */
    public static String hmacSha256Hex(String key, String data) {
        return hmacSha256Hex(hmac256(key.getBytes(UTF8), data), data);
    }

    /**
     * Calculate HMAC-SHA256 signature and convert to lowercase hexadecimal string
     * Note: This is necessary as, converting a String to byte[] and back may yield different results due to encoding differences or data loss.
     * @param key secret key in byte array
     * @param data data to be signed
     * @return lowercase hexadecimal string
     */
    public static String hmacSha256Hex(byte[] key, String data) {
        byte[] hmacResult = hmac256(key, data);
        return DatatypeConverter.printHexBinary(hmacResult).toLowerCase();
    }
} 