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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.confidentiality;

import java.nio.ByteBuffer;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import javax.crypto.Cipher;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.ShortBufferException;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Abstract class for IPMI confidentiality algorithms.
 */
public abstract class AbstractIpmiConfidentiality implements IpmiConfidentiality {

    public final Cipher cipher;

    public AbstractIpmiConfidentiality(String algorithm) throws NoSuchPaddingException, NoSuchAlgorithmException {
        this.cipher = Cipher.getInstance(algorithm);
    }

    @Override
    public int getBlockSize() {
        return cipher.getBlockSize();
    }

    public void init(int mode, SecretKeySpec key, IvParameterSpec iv) throws InvalidAlgorithmParameterException, InvalidKeyException {
        cipher.init(mode, key, iv);
    }

    public void update(ByteBuffer input, ByteBuffer output) throws ShortBufferException {
        cipher.update(input, output);
    }
}
