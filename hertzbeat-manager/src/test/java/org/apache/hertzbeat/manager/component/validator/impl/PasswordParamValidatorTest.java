/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.manager.component.validator.impl;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.manager.pojo.dto.MonitorParam;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordParamValidatorTest {

    private PasswordParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new PasswordParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("password"));
    }

    @Test
    void validate_EncryptsPlaintext() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("password");
        MonitorParam param = new MonitorParam();
        String plaintext = "password123";
        param.setParamValue(plaintext);

        validator.validate(paramDefine, param);

        assertNotEquals(plaintext, param.getParamValue());
        assertTrue(AesUtil.isCiphertext(param.getParamValue()));
        assertEquals(CommonConstants.PARAM_TYPE_PASSWORD, param.getType());
    }

    @Test
    void validate_DoesNotStorePlaintextWhenEncryptionFails() {
        String originalSecret = AesUtil.getDefaultSecretKey();
        try {
            AesUtil.setDefaultSecretKey("invalid-key");
            ParamDefineInfo paramDefine = new ParamDefineInfo();
            paramDefine.setType("password");
            MonitorParam param = new MonitorParam();
            String plaintext = "not-base64-sensitive-secret";
            param.setParamValue(plaintext);
            param.setType(CommonConstants.PARAM_TYPE_STRING);

            assertThrows(IllegalStateException.class, () -> validator.validate(paramDefine, param));
            assertEquals(plaintext, param.getParamValue());
            assertEquals(CommonConstants.PARAM_TYPE_STRING, param.getType());
        } finally {
            AesUtil.setDefaultSecretKey(originalSecret);
        }
    }

    @Test
    void validate_IgnoresCiphertext() {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setType("password");
        MonitorParam param = new MonitorParam();
        String ciphertext = AesUtil.aesEncode("password123");
        param.setParamValue(ciphertext);

        validator.validate(paramDefine, param);

        assertEquals(ciphertext, param.getParamValue());
        assertEquals(CommonConstants.PARAM_TYPE_PASSWORD, param.getType());
    }

    @Test
    void validate_IgnoresLegacyCiphertextUntilMigrationReencryptsIt() {
        String originalSecret = AesUtil.getDefaultSecretKey();
        try {
            AesUtil.setDefaultSecretKey("nextSecretKey123");
            String legacyCiphertext = AesUtil.aesEncode("password123", AesUtil.DEFAULT_ENCODE_RULES);
            ParamDefineInfo paramDefine = new ParamDefineInfo();
            paramDefine.setType("password");
            MonitorParam param = new MonitorParam();
            param.setParamValue(legacyCiphertext);

            validator.validate(paramDefine, param);

            assertEquals(legacyCiphertext, param.getParamValue());
            assertEquals(CommonConstants.PARAM_TYPE_PASSWORD, param.getType());
        } finally {
            AesUtil.setDefaultSecretKey(originalSecret);
        }
    }

    @Test
    void validate_RejectsAmbiguousCiphertextInEitherKeyDirection() {
        String originalSecret = AesUtil.getDefaultSecretKey();
        try {
            String currentKey = "newkey1234567890";
            AesUtil.setDefaultSecretKey(currentKey);
            ParamDefineInfo paramDefine = new ParamDefineInfo();
            paramDefine.setType("password");

            String defaultKeyCorrect =
                    "SEJBMgAAAAAAAAAAAAAAAAAAAz+DCz3LWaOCMiHK2E32IJCdysYty+2YhcUdccPp08KRjQ==";
            assertValidatorRejectsWithoutChanging(defaultKeyCorrect, paramDefine);

            String currentKeyCorrect = findWrongDefaultKeyValidPaddingFixture(currentKey);
            assertValidatorRejectsWithoutChanging(currentKeyCorrect, paramDefine);
        } finally {
            AesUtil.setDefaultSecretKey(originalSecret);
        }
    }

    private void assertValidatorRejectsWithoutChanging(String ciphertext, ParamDefineInfo paramDefine) {
        MonitorParam param = new MonitorParam();
        param.setParamValue(ciphertext);
        assertThrows(IllegalStateException.class, () -> validator.validate(paramDefine, param));
        assertEquals(ciphertext, param.getParamValue());
    }

    private String findWrongDefaultKeyValidPaddingFixture(String currentKey) {
        String plaintext = "123456789012345";
        for (int seed = 0; seed < 10_000; seed++) {
            byte[] iv = new byte[16];
            java.nio.ByteBuffer.wrap(iv, 12, 4).putInt(seed);
            String candidate = encryptHba2(plaintext, currentKey, iv);
            try {
                if (!plaintext.equals(AesUtil.aesDecode(candidate, AesUtil.DEFAULT_ENCODE_RULES))) {
                    return candidate;
                }
            } catch (IllegalStateException ignored) {
                // Wrong-key padding is invalid for this IV.
            }
        }
        throw new AssertionError("Could not find a wrong-key valid-padding fixture");
    }

    private String encryptHba2(String plaintext, String key, byte[] iv) {
        try {
            javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/CBC/PKCS5Padding");
            javax.crypto.spec.SecretKeySpec keySpec =
                    new javax.crypto.spec.SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "AES");
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
}
