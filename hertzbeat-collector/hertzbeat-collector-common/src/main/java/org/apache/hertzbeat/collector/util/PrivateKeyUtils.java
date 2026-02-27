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

package org.apache.hertzbeat.collector.util;

import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Objects;

/**
 * private key util
 * write private key to ~/.ssh
 */
@Slf4j
@UtilityClass
public class PrivateKeyUtils {

    private static final String KEY_PATH = System.getProperty("user.home") + "/.ssh";

    /**
     * write private key to ~/.ssh, filename is ~/.ssh/id_rsa_${host}
     * @param host   host
     * @param keyStr key string
     * @return key file path
     * @throws IOException if ~/.ssh is not exist and create dir error
     */
    public static String writePrivateKey(String host, String keyStr) throws IOException {
        var sshPath = Paths.get(KEY_PATH);
        if (!Files.exists(sshPath)) {
            Files.createDirectories(sshPath);
        }
        var keyPath = Paths.get(KEY_PATH, "id_rsa_" + host);
        if (!Files.exists(keyPath)) {
            Files.writeString(keyPath, keyStr);
        } else {
            var oldKey = Files.readString(keyPath);
            if (!Objects.equals(oldKey, keyStr)) {
                Files.writeString(keyPath, keyStr);
            }
        }
        return keyPath.toString();
    }

}
