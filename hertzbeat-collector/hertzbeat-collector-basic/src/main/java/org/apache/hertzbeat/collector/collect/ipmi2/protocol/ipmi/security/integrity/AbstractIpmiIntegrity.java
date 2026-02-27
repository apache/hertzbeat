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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity;

import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

/**
 * Abstract class for IPMI integrity algorithms.
 */
public abstract class AbstractIpmiIntegrity implements IpmiIntegrity {

    private final Mac mac;

    public AbstractIpmiIntegrity(String algorithm) throws NoSuchAlgorithmException {
        this.mac = Mac.getInstance(algorithm);
    }

    @Override
    public void setKey(byte[] key) throws InvalidKeyException {
        SecretKey secretKey = new SecretKeySpec(key, mac.getAlgorithm());
        mac.init(secretKey);
    }

    @Override
    public void setData(byte[] data) {
        mac.update(data);
    }

    @Override
    public byte[] getHash() {
        byte[] hash = mac.doFinal();
        int cutLength = getHashLength();
        if (hash.length > cutLength) {
            hash = Arrays.copyOf(hash, cutLength);
        }
        return hash;
    }

}
