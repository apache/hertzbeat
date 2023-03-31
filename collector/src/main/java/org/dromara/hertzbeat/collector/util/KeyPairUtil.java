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

package org.dromara.hertzbeat.collector.util;

import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.security.KeyPair;
import java.security.KeyPairGenerator;

/**
 * 密钥工具类
 *
 * @author tom
 * @date 2022/4/2 17:04
 */
@Slf4j
@UtilityClass
public class KeyPairUtil {

    private static KeyPairGenerator keyPairGenerator;

    static {
        try {
            keyPairGenerator = KeyPairGenerator.getInstance("RSA");
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 获取密钥对
     */
    public static KeyPair getKeyPairFromPrivateKey(String privateKeyStr) {
        if (!StringUtils.hasText(privateKeyStr)) {
            return null;
        }
        try {
            var keyPair = keyPairGenerator.generateKeyPair();
            var stream = new ByteArrayOutputStream();
            stream.write(privateKeyStr.getBytes());
            var oos = new ObjectOutputStream(stream);
            oos.writeObject(keyPair);
            return keyPair;
        } catch (Exception e) {
            log.info("[keyPair] parse failed, {}." + e.getMessage());
            return null;
        }
    }

}
