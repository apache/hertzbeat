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

package com.usthe.collector.util;

import lombok.extern.slf4j.Slf4j;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * 密钥工具类
 * @author tom
 * @date 2022/4/2 17:04
 */
@Slf4j
public class KeyPairUtil {

    private static KeyFactory keyFactory;

    static {
        try {
            keyFactory = KeyFactory.getInstance("RSA");
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 获取密钥对
     */
    public static KeyPair getKeyPairFromPublicKey(String publicKeyStr) {
        try {
            if (publicKeyStr == null || "".equals(publicKeyStr)) {
                return null;
            }
            // todo fix 公钥解析
            byte[] publicKeyBytes = Base64.getDecoder().decode(publicKeyStr);
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(publicKeyBytes);
            PublicKey publicKey = keyFactory.generatePublic(keySpec);
            return new KeyPair(publicKey, null);
        } catch (Exception e) {
            log.info("[keyPair] parse failed, {}." + e.getMessage());
            return null;
        }
    }

}
